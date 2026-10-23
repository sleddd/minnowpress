import { and, asc, count, desc, eq, gt, isNull, lte, ne, or, sql } from 'drizzle-orm';
import { countGraphemes } from '#lib/text.ts';
import type { DB } from './db/client';
import { challenges, stories, users, type Challenge } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

export const CHALLENGE_TITLE_MAX = 100;
export const CHALLENGE_PROMPT_MAX = 500;
const DAY = 24 * 60 * 60 * 1000;
/** Every challenge runs exactly this long; the daily cron starts the next one when it ends. */
export const CHALLENGE_DAYS = 14;

export const startOfUtcDay = (d: Date) =>
	new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const endFor = (startsAt: Date) => new Date(startsAt.getTime() + CHALLENGE_DAYS * DAY);
/** Challenges made here, not imported from the Ficly archive. */
const ours = isNull(challenges.archiveId);

export interface ChallengeInput {
	title: string;
	promptText: string;
}

export function validateChallenge(input: ChallengeInput) {
	const errors: Record<string, string> = {};
	const title = countGraphemes(input.title.trim(), CHALLENGE_TITLE_MAX);
	const prompt = countGraphemes(input.promptText.trim(), CHALLENGE_PROMPT_MAX);
	if (title === 0) errors.title = 'Give it a title.';
	else if (title > CHALLENGE_TITLE_MAX)
		errors.title = `Titles are ${CHALLENGE_TITLE_MAX} characters or less.`;
	if (prompt === 0) errors.promptText = 'Write the prompt.';
	else if (prompt > CHALLENGE_PROMPT_MAX)
		errors.promptText = `Prompts are ${CHALLENGE_PROMPT_MAX} characters or less.`;
	if (Object.keys(errors).length) throw new ValidationError(errors);
}

/** New challenges always start pending; a human approves and schedules them. */
export async function createChallenge(
	db: DB,
	input: ChallengeInput & { source: Challenge['source']; createdBy?: number | null }
): Promise<Challenge> {
	validateChallenge(input);
	const [row] = await db
		.insert(challenges)
		.values({
			title: input.title.trim(),
			promptText: input.promptText.trim(),
			source: input.source,
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row;
}

export function pendingPrompts(db: DB) {
	return db
		.select()
		.from(challenges)
		.where(eq(challenges.status, 'pending'))
		.orderBy(asc(challenges.createdAt), asc(challenges.id));
}

/** When the end of the queue is: challenges run back to back, so the next starts when the last ends. */
export async function suggestNextStart(db: DB, now = new Date()): Promise<Date> {
	const today = startOfUtcDay(now);
	const [last] = await db
		.select({ endsAt: challenges.endsAt })
		.from(challenges)
		.where(and(eq(challenges.status, 'approved'), ours, gt(challenges.endsAt, now)))
		.orderBy(desc(challenges.endsAt))
		.limit(1);
	return last?.endsAt && last.endsAt > today ? last.endsAt : today;
}

/** Only the start is chosen; every challenge ends CHALLENGE_DAYS later. */
export interface Schedule {
	startsAt: Date;
}

function checkSchedule({ startsAt }: Schedule) {
	if (Number.isNaN(startsAt.getTime()))
		throw new ValidationError({ startsAt: 'Pick a start date.' });
}

/** Approves a pending prompt, optionally with edits, and schedules it. */
export async function approvePrompt(
	db: DB,
	adminId: number,
	challengeId: number,
	schedule: Schedule,
	edits?: Partial<ChallengeInput>
): Promise<Challenge> {
	const existing = await db.query.challenges.findFirst({ where: eq(challenges.id, challengeId) });
	if (!existing) throw new NotFoundError('Challenge not found');
	if (existing.status !== 'pending')
		throw new ForbiddenError('Only pending prompts can be approved.');
	const title = edits?.title ?? existing.title;
	const promptText = edits?.promptText ?? existing.promptText;
	validateChallenge({ title, promptText });
	checkSchedule(schedule);
	const [row] = await db
		.update(challenges)
		.set({
			title: title.trim(),
			promptText: promptText.trim(),
			status: 'approved',
			approvedBy: adminId,
			startsAt: schedule.startsAt,
			endsAt: endFor(schedule.startsAt)
		})
		.where(eq(challenges.id, challengeId))
		.returning();
	return row;
}

export async function rejectPrompt(db: DB, challengeId: number): Promise<void> {
	const result = await db
		.update(challenges)
		.set({ status: 'rejected' })
		.where(and(eq(challenges.id, challengeId), eq(challenges.status, 'pending')))
		.returning({ id: challenges.id });
	if (result.length === 0) throw new NotFoundError('Pending prompt not found');
}

/** Moves an approved challenge to a new window. */
export async function scheduleChallenge(
	db: DB,
	challengeId: number,
	schedule: Schedule
): Promise<Challenge> {
	checkSchedule(schedule);
	const [row] = await db
		.update(challenges)
		.set({ startsAt: schedule.startsAt, endsAt: endFor(schedule.startsAt) })
		.where(and(eq(challenges.id, challengeId), eq(challenges.status, 'approved')))
		.returning();
	if (!row) throw new NotFoundError('Approved challenge not found');
	return row;
}

const isOpen = (now: Date) =>
	and(
		eq(challenges.status, 'approved'),
		lte(challenges.startsAt, now),
		or(isNull(challenges.endsAt), gt(challenges.endsAt, now))
	);

/** The most recently started challenge that is still open. */
export async function todaysPrompt(db: DB, now = new Date()): Promise<Challenge | null> {
	const [row] = await db
		.select()
		.from(challenges)
		.where(isOpen(now))
		.orderBy(desc(challenges.startsAt), desc(challenges.id))
		.limit(1);
	return row ?? null;
}

export function openChallenges(db: DB, now = new Date()) {
	return db
		.select()
		.from(challenges)
		.where(isOpen(now))
		.orderBy(desc(challenges.startsAt), desc(challenges.id));
}

/** Past challenges per page: titles only, eleven to a column across the desktop's three. */
export const CHALLENGES_PAGE_SIZE = 33;

/**
 * The challenges page: the open challenge, approved ones waiting their turn, and a page of
 * past ones, with entry counts. Past ones include the 1,300-odd challenges imported from Ficly,
 * after ours since they're older.
 */
export async function listChallenges(db: DB, opts: { page?: number; now?: Date } = {}) {
	const now = opts.now ?? new Date();
	const page = Math.max(1, opts.page ?? 1);
	// Spelled out: single-table selects drop table prefixes, which would bind "id" to stories here.
	const entries = sql<number>`(select count(*) from stories s where s.challenge_id = challenges.id and s.status = 'published')`;
	const approved = and(eq(challenges.status, 'approved'), ours);
	const select = () => db.select({ challenge: challenges, entries }).from(challenges);
	const [open, upcoming, closedRows] = await Promise.all([
		select()
			.where(and(isOpen(now), ours))
			.orderBy(desc(challenges.startsAt), desc(challenges.id)),
		select()
			.where(and(approved, gt(challenges.startsAt, now)))
			.orderBy(asc(challenges.startsAt), asc(challenges.id)),
		// Past challenges include the Ficly archive's, newest first, so ours come before theirs.
		select()
			.where(and(eq(challenges.status, 'approved'), lte(challenges.endsAt, now)))
			.orderBy(desc(challenges.startsAt), desc(challenges.id))
			.limit(CHALLENGES_PAGE_SIZE + 1)
			.offset((page - 1) * CHALLENGES_PAGE_SIZE)
	]);
	const flat = (rows: typeof open) =>
		rows.map((r) => ({ ...r.challenge, entries: Number(r.entries) }));
	const first = page === 1;
	return {
		open: first ? flat(open) : [],
		upcoming: first ? flat(upcoming) : [],
		closed: flat(closedRows.slice(0, CHALLENGES_PAGE_SIZE)),
		page,
		hasMore: closedRows.length > CHALLENGES_PAGE_SIZE
	};
}

/**
 * The most recently finished challenges, ours and the Ficly archive's, with entry counts: the
 * home page's Past challenges lane. Index-served, so it reads only the rows it returns.
 */
export async function pastChallenges(db: DB, limit = 6, now = new Date()) {
	const entries = sql<number>`(select count(*) from stories s where s.challenge_id = challenges.id and s.status = 'published')`;
	const rows = await db
		.select({ challenge: challenges, entries })
		.from(challenges)
		.where(and(eq(challenges.status, 'approved'), lte(challenges.endsAt, now)))
		.orderBy(desc(challenges.startsAt), desc(challenges.id))
		.limit(limit);
	return rows.map((r) => ({ ...r.challenge, entries: Number(r.entries) }));
}

/**
 * Admin: ends an open challenge now, then starts the next approved one in the queue if there is
 * one (no AI prompt is generated here; the daily job does that if the queue is empty).
 */
export async function closeChallenge(
	db: DB,
	challengeId: number,
	now = new Date()
): Promise<{ closed: Challenge; next: Challenge | null }> {
	const [closed] = await db
		.update(challenges)
		.set({ endsAt: now })
		.where(and(eq(challenges.id, challengeId), isOpen(now)))
		.returning();
	if (!closed) throw new NotFoundError('Open challenge not found');
	const { challenge: next } = await ensureCurrentChallenge(db, now);
	return { closed, next };
}

/**
 * Admin: deletes a challenge. Stories written for it stay up; they just lose the link. The next
 * in line takes its place, so there's still a current challenge and no gap in the queue.
 */
export async function deleteChallenge(
	db: DB,
	challengeId: number,
	now = new Date()
): Promise<void> {
	const result = await db
		.delete(challenges)
		.where(and(eq(challenges.id, challengeId), ours))
		.returning({ id: challenges.id });
	if (result.length === 0) throw new NotFoundError('Challenge not found');
	await ensureCurrentChallenge(db, now);
	await repackQueue(db, now);
}

export type ChallengeRotation =
	| { action: 'open' | 'started' | 'generated'; challenge: Challenge }
	| { action: 'none'; challenge: null };

/**
 * Keeps exactly one challenge running. If none is open, the next approved one in the queue
 * starts today; if the queue is empty, `generate` supplies a new prompt, which starts today.
 * Runs from the daily cron.
 */
export async function ensureCurrentChallenge(
	db: DB,
	now = new Date(),
	generate?: () => Promise<ChallengeInput | null>
): Promise<ChallengeRotation> {
	const open = await todaysPrompt(db, now);
	if (open) return { action: 'open', challenge: open };

	const startsAt = startOfUtcDay(now);
	const [queued] = await db
		.select()
		.from(challenges)
		.where(and(eq(challenges.status, 'approved'), ours, gt(challenges.startsAt, now)))
		.orderBy(asc(challenges.startsAt), asc(challenges.id))
		.limit(1);
	if (queued) {
		const started = await scheduleChallenge(db, queued.id, { startsAt });
		await repackQueue(db, now);
		return { action: 'started', challenge: started };
	}

	const input = generate ? await generate() : null;
	if (!input) return { action: 'none', challenge: null };
	const created = await createChallenge(db, { ...input, source: 'ai' });
	const [live] = await db
		.update(challenges)
		.set({ status: 'approved', startsAt, endsAt: endFor(startsAt) })
		.where(eq(challenges.id, created.id))
		.returning();
	return { action: 'generated', challenge: live };
}

/**
 * Keeps the line tidy without overriding dates an admin chose: a waiting challenge that would
 * overlap the one before it is pushed later (keeping its length); nothing is ever pulled earlier.
 * When nothing is open, ensureCurrentChallenge starts the next one anyway.
 */
export async function repackQueue(db: DB, now = new Date()): Promise<void> {
	const open = await todaysPrompt(db, now);
	let cursor = open?.endsAt ?? startOfUtcDay(now);
	const waiting = await db
		.select({ id: challenges.id, startsAt: challenges.startsAt, endsAt: challenges.endsAt })
		.from(challenges)
		.where(and(eq(challenges.status, 'approved'), ours, gt(challenges.startsAt, now)))
		.orderBy(asc(challenges.startsAt), asc(challenges.id));
	for (const c of waiting) {
		const start = c.startsAt!;
		const length = (c.endsAt?.getTime() ?? endFor(start).getTime()) - start.getTime();
		if (start < cursor) {
			const startsAt = cursor;
			const endsAt = new Date(cursor.getTime() + length);
			await db.update(challenges).set({ startsAt, endsAt }).where(eq(challenges.id, c.id));
			cursor = endsAt;
		} else {
			cursor = new Date(start.getTime() + length);
		}
	}
}

/**
 * Admin: sets a challenge's start and end by hand. If that makes it the open one while another
 * is open, the other moves to the front of the line and runs right after it.
 */
export async function rescheduleChallengeDates(
	db: DB,
	challengeId: number,
	dates: { startsAt: Date; endsAt: Date },
	now = new Date()
): Promise<Challenge> {
	if (Number.isNaN(dates.startsAt.getTime()) || Number.isNaN(dates.endsAt.getTime()))
		throw new ValidationError({ dates: 'Pick a start and an end date.' });
	if (dates.endsAt.getTime() <= dates.startsAt.getTime())
		throw new ValidationError({ dates: 'The end has to come after the start.' });
	const [row] = await db
		.update(challenges)
		.set(dates)
		.where(and(eq(challenges.id, challengeId), eq(challenges.status, 'approved'), ours))
		.returning();
	if (!row) throw new NotFoundError('Challenge not found');
	await settleAround(db, row, now);
	return row;
}

/** Admin: makes a finished challenge the current one again, for another CHALLENGE_DAYS. */
export async function reopenChallenge(
	db: DB,
	challengeId: number,
	now = new Date()
): Promise<Challenge> {
	const existing = await db.query.challenges.findFirst({
		where: and(eq(challenges.id, challengeId), eq(challenges.status, 'approved'), ours)
	});
	if (!existing) throw new NotFoundError('Challenge not found');
	const endsAt = endFor(startOfUtcDay(now));
	const startsAt =
		existing.startsAt && existing.startsAt.getTime() <= now.getTime()
			? existing.startsAt
			: startOfUtcDay(now);
	const [row] = await db
		.update(challenges)
		.set({ startsAt, endsAt })
		.where(eq(challenges.id, challengeId))
		.returning();
	await settleAround(db, row, now);
	return row;
}

/** One challenge open at a time: any other open one steps back to run after `current`. */
async function settleAround(db: DB, current: Challenge, now: Date) {
	const isOpenNow =
		current.startsAt !== null &&
		current.startsAt.getTime() <= now.getTime() &&
		(current.endsAt === null || current.endsAt.getTime() > now.getTime());
	if (isOpenNow) {
		const others = await db
			.select()
			.from(challenges)
			.where(and(isOpen(now), ours, ne(challenges.id, current.id)))
			.orderBy(asc(challenges.startsAt));
		let cursor = current.endsAt ?? endFor(startOfUtcDay(now));
		for (const other of others) {
			await db
				.update(challenges)
				.set({ startsAt: cursor, endsAt: endFor(cursor) })
				.where(eq(challenges.id, other.id));
			cursor = endFor(cursor);
		}
	}
	await ensureCurrentChallenge(db, now);
	await repackQueue(db, now);
}

/**
 * A challenge visible to the public: any approved one. Ones waiting their turn get a preview
 * page (`upcoming`), but can't be entered until they open.
 */
export async function getChallenge(db: DB, challengeId: number, now = new Date()) {
	const row = await db.query.challenges.findFirst({
		where: and(eq(challenges.id, challengeId), eq(challenges.status, 'approved'))
	});
	if (!row) return null;
	const creator = row.createdBy
		? await db.query.users.findFirst({ where: eq(users.id, row.createdBy) })
		: undefined;
	return {
		...row,
		isOpen:
			(row.startsAt === null || row.startsAt.getTime() <= now.getTime()) &&
			(row.endsAt === null || row.endsAt.getTime() > now.getTime()),
		upcoming: row.startsAt !== null && row.startsAt.getTime() > now.getTime(),
		creator: creator ? { username: creator.username, displayName: creator.displayName } : null
	};
}

/** How many prompts one member can have waiting for review at once. */
export const MAX_PENDING_PER_MEMBER = 3;

/** A member suggests a challenge. Like AI suggestions, it waits for an admin to approve and schedule it. */
export async function proposeChallenge(
	db: DB,
	userId: number,
	input: ChallengeInput
): Promise<Challenge> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(challenges)
		.where(and(eq(challenges.createdBy, userId), eq(challenges.status, 'pending')));
	if (n >= MAX_PENDING_PER_MEMBER)
		throw new ValidationError({
			form: `You have ${n} challenges waiting for review. Wait until they're reviewed to suggest more.`
		});
	return createChallenge(db, { ...input, source: 'human', createdBy: userId });
}

/** Enters an existing published story of the user's into a challenge that has opened (current or past). */
export async function submitToChallenge(
	db: DB,
	userId: number,
	storyId: number,
	challengeId: number,
	now = new Date()
) {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story || story.status !== 'published') throw new NotFoundError('Story not found');
	if (story.authorId !== userId) throw new ForbiddenError();
	const [started] = await db
		.select({ id: challenges.id })
		.from(challenges)
		.where(
			and(
				eq(challenges.id, challengeId),
				eq(challenges.status, 'approved'),
				lte(challenges.startsAt, now)
			)
		);
	if (!started) throw new ValidationError({ challenge: 'That challenge hasn’t opened yet.' });
	await db.update(stories).set({ challengeId }).where(eq(stories.id, storyId));
}

/** Published stories entered in a challenge. */
export async function countEntries(db: DB, challengeId: number): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(stories)
		.where(and(eq(stories.challengeId, challengeId), eq(stories.status, 'published')));
	return n;
}
