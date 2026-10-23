import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	approvePrompt,
	countEntries,
	createChallenge,
	CHALLENGE_DAYS,
	closeChallenge,
	deleteChallenge,
	ensureCurrentChallenge,
	repackQueue,
	reopenChallenge,
	rescheduleChallengeDates,
	getChallenge,
	MAX_PENDING_PER_MEMBER,
	proposeChallenge,
	CHALLENGES_PAGE_SIZE,
	listChallenges,
	openChallenges,
	pastChallenges,
	pendingPrompts,
	rejectPrompt,
	scheduleChallenge,
	submitToChallenge,
	suggestNextStart,
	todaysPrompt,
	validateChallenge
} from './challenges';
import type { DB } from './db/client';
import { challenges, stories } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-21T12:00:00Z');
const TODAY = new Date('2026-10-21T00:00:00Z');

let db: DB;
let admin: { id: number };

beforeEach(async () => {
	db = await createTestDb();
	admin = await makeUser(db, { role: 'admin' });
});

const pending = (title = 'Fog') =>
	createChallenge(db, { title, promptText: 'A lighthouse in fog.', source: 'ai' });
const live = async (startsAt = new Date(NOW.getTime() - DAY)) =>
	approvePrompt(db, admin.id, (await pending()).id, { startsAt });
/** A challenge whose 14 days are over. */
const ended = (daysAgo = CHALLENGE_DAYS + 2) => live(new Date(NOW.getTime() - daysAgo * DAY));

describe('validateChallenge', () => {
	it('requires a title and prompt within limits', () => {
		expect(() => validateChallenge({ title: 'T', promptText: 'P' })).not.toThrow();
		expect(() => validateChallenge({ title: '', promptText: 'P' })).toThrow(ValidationError);
		expect(() => validateChallenge({ title: 'T', promptText: ' ' })).toThrow(ValidationError);
		expect(() => validateChallenge({ title: 'x'.repeat(101), promptText: 'P' })).toThrow(
			ValidationError
		);
		expect(() => validateChallenge({ title: 'T', promptText: 'x'.repeat(501) })).toThrow(
			ValidationError
		);
	});
});

describe('createChallenge / pendingPrompts', () => {
	it('creates pending challenges and lists them oldest first', async () => {
		const a = await pending('A');
		const b = await createChallenge(db, {
			title: ' B ',
			promptText: 'p',
			source: 'human',
			createdBy: admin.id
		});
		expect(a.status).toBe('pending');
		expect(b.title).toBe('B');
		expect(b.createdBy).toBe(admin.id);
		expect((await pendingPrompts(db)).map((c) => c.id)).toEqual([a.id, b.id]);
	});
});

describe('approvePrompt', () => {
	it('approves with a fourteen-day window and records the approver', async () => {
		const c = await pending();
		const approved = await approvePrompt(db, admin.id, c.id, { startsAt: TODAY });
		expect(approved.status).toBe('approved');
		expect(approved.approvedBy).toBe(admin.id);
		expect(approved.endsAt?.getTime()).toBe(TODAY.getTime() + 14 * DAY);
		expect(await pendingPrompts(db)).toEqual([]);
	});

	it('applies edits', async () => {
		const c = await pending();
		const approved = await approvePrompt(
			db,
			admin.id,
			c.id,
			{ startsAt: TODAY },
			{ title: 'Mist' }
		);
		expect(approved.title).toBe('Mist');
	});

	it('rejects bad schedules, edits, and non-pending prompts', async () => {
		const c = await pending();
		await expect(approvePrompt(db, admin.id, c.id, { startsAt: new Date('nope') })).rejects.toThrow(
			ValidationError
		);
		await expect(
			approvePrompt(db, admin.id, c.id, { startsAt: TODAY }, { title: '' })
		).rejects.toThrow(ValidationError);
		await approvePrompt(db, admin.id, c.id, { startsAt: TODAY });
		await expect(approvePrompt(db, admin.id, c.id, { startsAt: TODAY })).rejects.toThrow(
			ForbiddenError
		);
		await expect(approvePrompt(db, admin.id, 9999, { startsAt: TODAY })).rejects.toThrow(
			NotFoundError
		);
	});
});

describe('rejectPrompt', () => {
	it('rejects pending prompts only', async () => {
		const c = await pending();
		await rejectPrompt(db, c.id);
		expect(await pendingPrompts(db)).toEqual([]);
		await expect(rejectPrompt(db, c.id)).rejects.toThrow(NotFoundError);
	});
});

describe('scheduleChallenge', () => {
	it('moves an approved challenge, keeping its fourteen days', async () => {
		const c = await live();
		const later = new Date(NOW.getTime() + 5 * DAY);
		const moved = await scheduleChallenge(db, c.id, { startsAt: later });
		expect(moved.startsAt?.getTime()).toBe(later.getTime());
		expect(moved.endsAt?.getTime()).toBe(later.getTime() + 14 * DAY);
	});

	it('refuses pending challenges and bad dates', async () => {
		const c = await pending();
		await expect(scheduleChallenge(db, c.id, { startsAt: TODAY })).rejects.toThrow(NotFoundError);
		await expect(scheduleChallenge(db, c.id, { startsAt: new Date('nope') })).rejects.toThrow(
			ValidationError
		);
	});
});

describe('suggestNextStart', () => {
	it('is today when nothing is scheduled', async () => {
		expect((await suggestNextStart(db, NOW)).getTime()).toBe(TODAY.getTime());
	});

	it('is when the running challenge ends', async () => {
		await live(TODAY);
		expect((await suggestNextStart(db, NOW)).getTime()).toBe(TODAY.getTime() + 14 * DAY);
	});

	it('is the end of the queue', async () => {
		await live(TODAY);
		await live(new Date(TODAY.getTime() + 14 * DAY));
		expect((await suggestNextStart(db, NOW)).getTime()).toBe(TODAY.getTime() + 28 * DAY);
	});
});

describe('todaysPrompt and listings', () => {
	it('picks the most recently started open challenge', async () => {
		await live(new Date(NOW.getTime() - 3 * DAY));
		const newer = await live(new Date(NOW.getTime() - DAY));
		await live(new Date(NOW.getTime() + DAY));
		expect((await todaysPrompt(db, NOW))?.id).toBe(newer.id);
		expect(await openChallenges(db, NOW)).toHaveLength(2);
	});

	it('returns null when nothing is open', async () => {
		await ended();
		await pending();
		expect(await todaysPrompt(db, NOW)).toBeNull();
	});

	it('lists started challenges split into open and closed, with entry counts', async () => {
		const author = await makeUser(db);
		const closed = await ended();
		const open = await live(new Date(NOW.getTime() - DAY));
		const upcoming = await live(new Date(NOW.getTime() + DAY));
		const [ficly] = await db
			.insert(challenges)
			.values({
				title: 'From Ficly',
				promptText: 'p',
				source: 'human',
				status: 'approved',
				startsAt: new Date('2009-05-01T00:00:00Z'),
				endsAt: new Date('2009-05-08T00:00:00Z'),
				archiveId: 1
			})
			.returning();
		await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true,
			challengeId: open.id
		});
		await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: false,
			challengeId: open.id
		});

		const { open: o, upcoming: u, closed: c, hasMore } = await listChallenges(db, { now: NOW });
		expect(o.map((x) => [x.id, x.entries])).toEqual([[open.id, 1]]);
		expect(u.map((x) => x.id)).toEqual([upcoming.id]);
		// Past challenges include the Ficly archive's, after ours.
		expect(c.map((x) => [x.id, x.entries])).toEqual([
			[closed.id, 0],
			[ficly.id, 0]
		]);
		expect(hasMore).toBe(false);
	});

	it('pages closed challenges and shows open ones on the first page only', async () => {
		const open = await live();
		for (let i = 0; i < CHALLENGES_PAGE_SIZE + 1; i++) await ended(20 + i);
		const first = await listChallenges(db, { now: NOW });
		expect(first.open.map((x) => x.id)).toEqual([open.id]);
		expect(first.closed).toHaveLength(CHALLENGES_PAGE_SIZE);
		expect(first.hasMore).toBe(true);
		const second = await listChallenges(db, { now: NOW, page: 2 });
		expect(second.open).toEqual([]);
		expect(second.closed).toHaveLength(1);
		expect(second.hasMore).toBe(false);
	});

	it('getChallenge hides pending challenges and previews ones coming up', async () => {
		const p = await pending();
		const future = await live(new Date(NOW.getTime() + DAY));
		const current = await live();
		expect(await getChallenge(db, p.id, NOW)).toBeNull();
		expect(await getChallenge(db, future.id, NOW)).toMatchObject({
			id: future.id,
			isOpen: false,
			upcoming: true
		});
		expect(await getChallenge(db, current.id, NOW)).toMatchObject({
			id: current.id,
			isOpen: true,
			upcoming: false
		});
	});
});

describe('ensureCurrentChallenge', () => {
	const generate = async () => ({ title: 'Tide', promptText: 'What the sea gave back.' });

	it('leaves a running challenge alone', async () => {
		const current = await live();
		const gen = vi.fn(generate);
		expect(await ensureCurrentChallenge(db, NOW, gen)).toMatchObject({
			action: 'open',
			challenge: { id: current.id }
		});
		expect(gen).not.toHaveBeenCalled();
	});

	it('starts the next approved challenge today when the last one has ended', async () => {
		await ended();
		const queued = await live(new Date(NOW.getTime() + 5 * DAY));
		const result = await ensureCurrentChallenge(db, NOW, generate);
		expect(result).toMatchObject({ action: 'started', challenge: { id: queued.id } });
		expect(result.challenge?.startsAt?.getTime()).toBe(TODAY.getTime());
		expect(result.challenge?.endsAt?.getTime()).toBe(TODAY.getTime() + 14 * DAY);
	});

	it('generates and starts a new AI challenge when nothing is waiting', async () => {
		await ended();
		await pending('Still waiting for review');
		const result = await ensureCurrentChallenge(db, NOW, generate);
		expect(result).toMatchObject({
			action: 'generated',
			challenge: { title: 'Tide', source: 'ai', status: 'approved' }
		});
		expect((await todaysPrompt(db, NOW))?.id).toBe(result.challenge?.id);
		expect(result.challenge?.endsAt?.getTime()).toBe(TODAY.getTime() + 14 * DAY);
	});

	it('does nothing without a generator or when it returns nothing', async () => {
		expect(await ensureCurrentChallenge(db, NOW)).toEqual({ action: 'none', challenge: null });
		expect(await ensureCurrentChallenge(db, NOW, async () => null)).toEqual({
			action: 'none',
			challenge: null
		});
	});
});

describe('closeChallenge / deleteChallenge', () => {
	it('closes an open challenge early and starts the next one in line', async () => {
		const current = await live();
		const queued = await live(new Date(NOW.getTime() + 13 * DAY));
		const { closed, next } = await closeChallenge(db, current.id, NOW);
		expect(closed.endsAt?.getTime()).toBe(NOW.getTime());
		expect(next?.id).toBe(queued.id);
		expect((await todaysPrompt(db, NOW))?.id).toBe(queued.id);
		await expect(closeChallenge(db, current.id, NOW)).rejects.toThrow(NotFoundError);
	});

	it('closes with nothing waiting, leaving no challenge open', async () => {
		const current = await live();
		expect((await closeChallenge(db, current.id, NOW)).next).toBeNull();
		expect(await todaysPrompt(db, NOW)).toBeNull();
	});

	it('deletes a challenge but keeps the stories written for it', async () => {
		const author = await makeUser(db);
		const c = await live();
		const story = await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true,
			challengeId: c.id
		});
		await deleteChallenge(db, c.id);
		expect(await getChallenge(db, c.id, NOW)).toBeNull();
		const [kept] = await db.select().from(stories).where(eq(stories.id, story.id));
		expect(kept.challengeId).toBeNull();
		await expect(deleteChallenge(db, c.id)).rejects.toThrow(NotFoundError);
	});

	it('deleting the open challenge starts the next one; later ones keep their dates', async () => {
		const current = await live(TODAY);
		const second = await live(new Date(TODAY.getTime() + 14 * DAY));
		const third = await live(new Date(TODAY.getTime() + 28 * DAY));
		await deleteChallenge(db, current.id, NOW);
		expect((await todaysPrompt(db, NOW))?.id).toBe(second.id);
		const { upcoming } = await listChallenges(db, { now: NOW });
		expect(upcoming.map((c) => [c.id, c.startsAt?.getTime()])).toEqual([
			[third.id, TODAY.getTime() + 28 * DAY]
		]);
	});

	it('will not delete Ficly archive challenges', async () => {
		const [archived] = await db
			.insert(challenges)
			.values({ title: 'Old', promptText: 'p', source: 'human', status: 'approved', archiveId: 9 })
			.returning();
		await expect(deleteChallenge(db, archived.id)).rejects.toThrow(NotFoundError);
	});
});

describe('repackQueue', () => {
	it('pushes a waiting challenge later only when it would overlap; never earlier', async () => {
		const open = await live(TODAY);
		const clash = await live(new Date(TODAY.getTime() + 3 * DAY));
		const far = await live(new Date(TODAY.getTime() + 60 * DAY));
		await repackQueue(db, NOW);
		const { upcoming } = await listChallenges(db, { now: NOW });
		expect(upcoming.map((c) => [c.id, c.startsAt?.getTime(), c.endsAt?.getTime()])).toEqual([
			[clash.id, open.endsAt!.getTime(), open.endsAt!.getTime() + 14 * DAY],
			[far.id, TODAY.getTime() + 60 * DAY, TODAY.getTime() + 74 * DAY]
		]);
	});

	it('starts the queue today when nothing is open', async () => {
		await live(new Date(TODAY.getTime() + 30 * DAY));
		const started = await ensureCurrentChallenge(db, NOW);
		expect(started.action).toBe('started');
		expect(started.challenge?.startsAt?.getTime()).toBe(TODAY.getTime());
	});
});

describe('rescheduleChallengeDates / reopenChallenge', () => {
	it('sets dates by hand and keeps them', async () => {
		await live(TODAY);
		const queued = await live(new Date(TODAY.getTime() + 14 * DAY));
		const startsAt = new Date(TODAY.getTime() + 40 * DAY);
		const endsAt = new Date(TODAY.getTime() + 50 * DAY);
		await rescheduleChallengeDates(db, queued.id, { startsAt, endsAt }, NOW);
		const [c] = (await listChallenges(db, { now: NOW })).upcoming;
		expect([c.startsAt?.getTime(), c.endsAt?.getTime()]).toEqual([
			startsAt.getTime(),
			endsAt.getTime()
		]);
	});

	it('moving a waiting challenge to today makes it current; the old one runs next', async () => {
		const current = await live(TODAY);
		const queued = await live(new Date(TODAY.getTime() + 14 * DAY));
		await rescheduleChallengeDates(
			db,
			queued.id,
			{ startsAt: TODAY, endsAt: new Date(TODAY.getTime() + 7 * DAY) },
			NOW
		);
		expect((await todaysPrompt(db, NOW))?.id).toBe(queued.id);
		const { upcoming } = await listChallenges(db, { now: NOW });
		expect(upcoming.map((c) => [c.id, c.startsAt?.getTime()])).toEqual([
			[current.id, TODAY.getTime() + 7 * DAY]
		]);
	});

	it('refuses bad dates and unknown challenges', async () => {
		const c = await live(TODAY);
		await expect(
			rescheduleChallengeDates(db, c.id, { startsAt: TODAY, endsAt: TODAY }, NOW)
		).rejects.toThrow(ValidationError);
		await expect(
			rescheduleChallengeDates(db, c.id, { startsAt: new Date('x'), endsAt: TODAY }, NOW)
		).rejects.toThrow(ValidationError);
		await expect(
			rescheduleChallengeDates(db, 9999, { startsAt: TODAY, endsAt: NOW }, NOW)
		).rejects.toThrow(NotFoundError);
		await expect(reopenChallenge(db, 9999, NOW)).rejects.toThrow(NotFoundError);
	});

	it('reopens a finished challenge for another fourteen days, ahead of the current one', async () => {
		const past = await ended();
		const current = await live(TODAY);
		const reopened = await reopenChallenge(db, past.id, NOW);
		expect(reopened.startsAt?.getTime()).toBe(past.startsAt?.getTime());
		expect(reopened.endsAt?.getTime()).toBe(TODAY.getTime() + 14 * DAY);
		expect((await todaysPrompt(db, NOW))?.id).toBe(past.id);
		const { upcoming } = await listChallenges(db, { now: NOW });
		expect(upcoming.map((c) => c.id)).toEqual([current.id]);
	});
});

describe('submitToChallenge', () => {
	it('enters your own published story into an open challenge', async () => {
		const author = await makeUser(db);
		const other = await makeUser(db);
		const c = await live(new Date(Date.now() - DAY));
		const story = await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true
		});
		await expect(submitToChallenge(db, other.id, story.id, c.id)).rejects.toThrow(ForbiddenError);
		await expect(submitToChallenge(db, author.id, 9999, c.id)).rejects.toThrow(NotFoundError);
		await submitToChallenge(db, author.id, story.id, c.id);
		const { open } = await listChallenges(db);
		expect(open[0].entries).toBe(1);
	});

	it('accepts past challenges but not ones that haven’t opened', async () => {
		const author = await makeUser(db);
		const past = await live(new Date(Date.now() - 20 * DAY));
		const later = await live(new Date(Date.now() + 2 * DAY));
		const story = await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true
		});
		await submitToChallenge(db, author.id, story.id, past.id);
		await expect(submitToChallenge(db, author.id, story.id, later.id)).rejects.toThrow(
			ValidationError
		);
	});
});

describe('countEntries', () => {
	it('counts published stories in a challenge', async () => {
		const author = await makeUser(db);
		const c = await live(new Date(Date.now() - DAY));
		await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true,
			challengeId: c.id
		});
		await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: false,
			challengeId: c.id
		});
		expect(await countEntries(db, c.id)).toBe(1);
	});
});

describe('proposeChallenge', () => {
	it('queues a member suggestion for review, credited to them', async () => {
		const member = await makeUser(db, { displayName: 'Kevin' });
		const c = await proposeChallenge(db, member.id, {
			title: 'Lights Out',
			promptText: 'The power goes out.'
		});
		expect(c).toMatchObject({ status: 'pending', source: 'human', createdBy: member.id });
		await approvePrompt(db, admin.id, c.id, { startsAt: new Date(Date.now() - DAY) });
		expect((await getChallenge(db, c.id))?.creator).toEqual({
			username: member.username,
			displayName: 'Kevin'
		});
	});

	it('caps how many suggestions one member can have pending', async () => {
		const member = await makeUser(db);
		for (let i = 0; i < MAX_PENDING_PER_MEMBER; i++)
			await proposeChallenge(db, member.id, { title: `C${i}`, promptText: 'p' });
		await expect(
			proposeChallenge(db, member.id, { title: 'One more', promptText: 'p' })
		).rejects.toThrow(ValidationError);
	});

	it('has no creator for AI suggestions', async () => {
		const c = await live();
		expect((await getChallenge(db, c.id))?.creator).toBeNull();
	});
});

describe('pastChallenges', () => {
	it('lists finished challenges, ours and the archive’s, newest first, with entry counts', async () => {
		const db = await createTestDb();
		const now = new Date('2026-10-22T12:00:00Z');
		const add = (
			title: string,
			startsAt: string,
			endsAt: string,
			archiveId: number | null = null
		) =>
			db
				.insert(challenges)
				.values({
					title,
					promptText: 'p',
					source: 'human',
					status: 'approved',
					startsAt: new Date(startsAt),
					endsAt: new Date(endsAt),
					archiveId
				})
				.returning()
				.then(([c]) => c);
		const ficly = await add('Tomb', '2010-03-01T00:00:00Z', '2010-03-15T00:00:00Z', 7);
		const ours = await add('Low tide', '2026-09-01T00:00:00Z', '2026-09-15T00:00:00Z');
		await add('Still open', '2026-10-20T00:00:00Z', '2026-11-03T00:00:00Z');
		await db.insert(challenges).values({ title: 'Pending', promptText: 'p', source: 'ai' });
		const author = await makeUser(db);
		await createStory(db, author.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: [],
			publish: true,
			challengeId: ficly.id
		});
		const past = await pastChallenges(db, 6, now);
		expect(past.map((c) => [c.id, c.entries])).toEqual([
			[ours.id, 0],
			[ficly.id, 1]
		]);
		expect(await pastChallenges(db, 1, now)).toHaveLength(1);
	});
});
