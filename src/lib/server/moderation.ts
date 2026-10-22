import { and, asc, eq, inArray } from 'drizzle-orm';
import { countGraphemes } from '#lib/text.ts';
import type { DB } from './db/client';
import { comments, reports, sessions, stories, users, type Report } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { deleteComment } from './social';
import { removeStory } from './stories';

export const REPORT_REASONS = ['ai_generated', 'spam', 'abuse', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_NOTE_MAX = 500;

export interface ReportInput {
	targetType: Report['targetType'];
	targetId: number;
	reason: ReportReason;
	note?: string;
}

async function targetExists(db: DB, type: Report['targetType'], id: number) {
	if (type === 'story') {
		const s = await db.query.stories.findFirst({ where: eq(stories.id, id) });
		return s?.status === 'published';
	}
	const c = await db.query.comments.findFirst({ where: eq(comments.id, id) });
	return Boolean(c && !c.deletedAt);
}

/** Files a report. A second report by the same person on the same thing is a no-op. */
export async function fileReport(db: DB, reporterId: number, input: ReportInput): Promise<Report> {
	if (!REPORT_REASONS.includes(input.reason))
		throw new ValidationError({ reason: 'Pick a reason.' });
	const note = (input.note ?? '').trim();
	if (countGraphemes(note) > REPORT_NOTE_MAX)
		throw new ValidationError({ note: `Notes are ${REPORT_NOTE_MAX} characters or less.` });
	if (!(await targetExists(db, input.targetType, input.targetId))) throw new NotFoundError();

	const existing = await db.query.reports.findFirst({
		where: and(
			eq(reports.reporterId, reporterId),
			eq(reports.targetType, input.targetType),
			eq(reports.targetId, input.targetId),
			eq(reports.status, 'open')
		)
	});
	if (existing) return existing;

	const [row] = await db
		.insert(reports)
		.values({
			reporterId,
			targetType: input.targetType,
			targetId: input.targetId,
			reason: input.reason,
			note
		})
		.returning();
	return row;
}

/** Open reports, oldest first, with a preview of what was reported. */
export async function listOpenReports(db: DB) {
	const rows = await db
		.select({ report: reports, reporter: users.username })
		.from(reports)
		.innerJoin(users, eq(users.id, reports.reporterId))
		.where(eq(reports.status, 'open'))
		.orderBy(asc(reports.createdAt), asc(reports.id));

	const storyIds = rows
		.filter((r) => r.report.targetType === 'story')
		.map((r) => r.report.targetId);
	const commentIds = rows
		.filter((r) => r.report.targetType === 'comment')
		.map((r) => r.report.targetId);
	const storyRows = storyIds.length
		? await db
				.select({ id: stories.id, title: stories.title, body: stories.body })
				.from(stories)
				.where(inArray(stories.id, storyIds))
		: [];
	const commentRows = commentIds.length
		? await db
				.select({ id: comments.id, body: comments.body, storyId: comments.storyId })
				.from(comments)
				.where(inArray(comments.id, commentIds))
		: [];
	const previews = new Map<string, { title: string; body: string; storyId: number }>();
	for (const s of storyRows)
		previews.set(`story:${s.id}`, { title: s.title, body: s.body, storyId: s.id });
	for (const c of commentRows)
		previews.set(`comment:${c.id}`, { title: 'Comment', body: c.body, storyId: c.storyId });

	return rows.map(({ report, reporter }) => ({
		...report,
		reporter,
		target: previews.get(`${report.targetType}:${report.targetId}`) ?? null
	}));
}

export type OpenReport = Awaited<ReturnType<typeof listOpenReports>>[number];

/**
 * Closes a report. "remove" takes the story or comment down; "dismiss" leaves it.
 * Every other open report on the same target is closed the same way.
 */
export async function resolveReport(
	db: DB,
	moderatorId: number,
	reportId: number,
	action: 'remove' | 'dismiss'
): Promise<void> {
	const report = await db.query.reports.findFirst({ where: eq(reports.id, reportId) });
	if (!report || report.status !== 'open') throw new NotFoundError('Open report not found');

	if (action === 'remove') {
		if (report.targetType === 'story') await removeStory(db, report.targetId);
		else
			await deleteComment(db, moderatorId, report.targetId, { asModerator: true }).catch((e) => {
				if (!(e instanceof NotFoundError)) throw e;
			});
	}

	await db
		.update(reports)
		.set({
			status: action === 'remove' ? 'resolved' : 'dismissed',
			resolvedBy: moderatorId,
			resolvedAt: new Date()
		})
		.where(
			and(
				eq(reports.targetType, report.targetType),
				eq(reports.targetId, report.targetId),
				eq(reports.status, 'open')
			)
		);
}

/**
 * Suspends a member: every session ends and they can't sign back in. Their stories stay up;
 * take those down through reports. Only ordinary members can be suspended, never staff.
 */
export async function suspendUser(db: DB, userId: number, now = new Date()): Promise<void> {
	const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
	if (!target || target.isArchive) throw new NotFoundError('User not found');
	if (target.role !== 'user') throw new ForbiddenError('Moderators and admins can’t be suspended.');
	await db.update(users).set({ suspendedAt: now }).where(eq(users.id, userId));
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Lets a suspended member sign in again. */
export async function unsuspendUser(db: DB, userId: number): Promise<void> {
	const [row] = await db
		.update(users)
		.set({ suspendedAt: null })
		.where(eq(users.id, userId))
		.returning({ id: users.id });
	if (!row) throw new NotFoundError('User not found');
}
