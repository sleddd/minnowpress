import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { eq } from 'drizzle-orm';
import { createSession, validateSession } from './auth';
import { moderationLog, reports, users } from './db/schema';
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from './errors';
import { HOURLY_LIMITS } from './limits';
import {
	fileReport,
	listOpenReports,
	resolveReport,
	suspendUser,
	unsuspendUser
} from './moderation';
import { addComment, listComments } from './social';
import { createStory, getStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let author: { id: number };
let reporter: { id: number };
let mod: { id: number };
let storyId: number;

beforeEach(async () => {
	db = await createTestDb();
	author = await makeUser(db);
	reporter = await makeUser(db, { username: 'reporter' });
	mod = await makeUser(db, { role: 'mod' });
	storyId = (
		await createStory(db, author.id, {
			title: 'Suspicious',
			body: 'Text' + PAD,
			tags: [],
			publish: true
		})
	).id;
});

describe('fileReport', () => {
	it('files a report and de-duplicates repeat reports by the same person', async () => {
		const a = await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'ai_generated',
			note: ' reads like a bot '
		});
		const b = await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'spam'
		});
		expect(a.id).toBe(b.id);
		expect(a.note).toBe('reads like a bot');
		expect(await db.select().from(reports)).toHaveLength(1);
	});

	it('validates the reason, note, and target', async () => {
		await expect(
			fileReport(db, reporter.id, {
				targetType: 'story',
				targetId: storyId,
				reason: 'nope' as never
			})
		).rejects.toThrow(ValidationError);
		await expect(
			fileReport(db, reporter.id, {
				targetType: 'story',
				targetId: storyId,
				reason: 'other',
				note: 'x'.repeat(501)
			})
		).rejects.toThrow(ValidationError);
		await expect(
			fileReport(db, reporter.id, { targetType: 'story', targetId: 9999, reason: 'spam' })
		).rejects.toThrow(NotFoundError);
		await expect(
			fileReport(db, reporter.id, { targetType: 'comment', targetId: 9999, reason: 'spam' })
		).rejects.toThrow(NotFoundError);
	});
});

describe('listOpenReports', () => {
	it('includes the reporter and a preview of the target', async () => {
		const comment = await addComment(db, author.id, storyId, 'buy pills');
		await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'ai_generated'
		});
		await fileReport(db, reporter.id, {
			targetType: 'comment',
			targetId: comment.id,
			reason: 'spam'
		});
		const list = await listOpenReports(db);
		expect(list).toHaveLength(2);
		expect(list[0]).toMatchObject({
			reporter: 'reporter',
			target: { title: 'Suspicious', body: 'Text' + PAD, storyId }
		});
		expect(list[1].target).toEqual({ title: 'Comment', body: 'buy pills', storyId });
	});

	it('is empty when there are no open reports', async () => {
		expect(await listOpenReports(db)).toEqual([]);
	});
});

describe('report limits', () => {
	it('refuses a flood of reports and leaves no trace of the refused one', async () => {
		const other = await makeUser(db);
		const report = (targetId: number, reporterId = reporter.id) =>
			fileReport(db, reporterId, { targetType: 'story', targetId, reason: 'spam' });
		for (let i = 0; i < HOURLY_LIMITS.report; i++) {
			const s = await createStory(db, other.id, {
				title: `S${i}`,
				body: 'Text' + PAD,
				tags: [],
				publish: true
			});
			await report(s.id);
		}
		await expect(report(storyId)).rejects.toThrow(RateLimitError);
		expect(await listOpenReports(db)).toHaveLength(HOURLY_LIMITS.report);
		await expect(report(storyId, other.id)).resolves.toBeDefined();
	});
});

describe('reports that a story should be mature', () => {
	it('marks the story mature and closes the report', async () => {
		const r = await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'mature'
		});
		await resolveReport(db, mod.id, r.id, 'mature');
		const story = await getStory(db, storyId);
		expect(story).toMatchObject({ isMature: true, matureLocked: true });
		expect(await listOpenReports(db)).toEqual([]);
		const [entry] = await db.select().from(moderationLog);
		expect(entry).toMatchObject({ action: 'mark_mature', reportId: r.id });
	});

	it('only applies to stories', async () => {
		const comment = await addComment(db, reporter.id, storyId, 'hm');
		await expect(
			fileReport(db, reporter.id, { targetType: 'comment', targetId: comment.id, reason: 'mature' })
		).rejects.toThrow(ValidationError);
		const r = await fileReport(db, reporter.id, {
			targetType: 'comment',
			targetId: comment.id,
			reason: 'abuse'
		});
		await expect(resolveReport(db, mod.id, r.id, 'mature')).rejects.toThrow(ValidationError);
	});
});

describe('resolveReport', () => {
	it('removes a reported story and closes every open report on it', async () => {
		const other = await makeUser(db);
		const r1 = await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'ai_generated'
		});
		await fileReport(db, other.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'ai_generated'
		});
		await resolveReport(db, mod.id, r1.id, 'remove');
		expect(await getStory(db, storyId)).toBeNull();
		expect(await listOpenReports(db)).toEqual([]);
		const rows = await db.select().from(reports);
		expect(rows.every((r) => r.status === 'resolved' && r.resolvedBy === mod.id)).toBe(true);
		expect(await db.select().from(moderationLog)).toMatchObject([
			{ actorId: mod.id, action: 'remove_story', targetId: storyId, reportId: r1.id }
		]);
	});

	it('removes a reported comment', async () => {
		const comment = await addComment(db, author.id, storyId, 'spam');
		const r = await fileReport(db, reporter.id, {
			targetType: 'comment',
			targetId: comment.id,
			reason: 'spam'
		});
		await resolveReport(db, mod.id, r.id, 'remove');
		expect(await listComments(db, storyId)).toEqual([]);
		expect(await db.select().from(moderationLog)).toMatchObject([
			{ actorId: mod.id, action: 'delete_comment', targetId: comment.id, reportId: r.id }
		]);
	});

	it('still closes the report if the comment was already deleted', async () => {
		const comment = await addComment(db, author.id, storyId, 'spam');
		const r = await fileReport(db, reporter.id, {
			targetType: 'comment',
			targetId: comment.id,
			reason: 'spam'
		});
		const { deleteComment } = await import('./social');
		await deleteComment(db, author.id, comment.id);
		await resolveReport(db, mod.id, r.id, 'remove');
		expect(await listOpenReports(db)).toEqual([]);
	});

	it('dismisses without removing', async () => {
		const r = await fileReport(db, reporter.id, {
			targetType: 'story',
			targetId: storyId,
			reason: 'other'
		});
		await resolveReport(db, mod.id, r.id, 'dismiss');
		expect(await getStory(db, storyId)).not.toBeNull();
		expect((await db.select().from(reports))[0].status).toBe('dismissed');
		expect(await db.select().from(moderationLog)).toMatchObject([
			{
				actorId: mod.id,
				action: 'dismiss_report',
				targetType: 'story',
				targetId: storyId,
				reportId: r.id
			}
		]);
		await expect(resolveReport(db, mod.id, r.id, 'dismiss')).rejects.toThrow(NotFoundError);
	});
});

describe('suspension', () => {
	it('signs a member out everywhere until it is lifted', async () => {
		const { token } = await createSession(db, author.id);
		await suspendUser(db, mod.id, author.id, new Date('2026-04-01T00:00:00Z'));
		const row = await db.query.users.findFirst({ where: eq(users.id, author.id) });
		expect(row?.suspendedAt).toEqual(new Date('2026-04-01T00:00:00Z'));
		expect(await validateSession(db, token)).toBeNull();

		await unsuspendUser(db, mod.id, author.id);
		const fresh = await createSession(db, author.id);
		expect(await validateSession(db, fresh.token)).not.toBeNull();
		expect(
			(await db.select().from(moderationLog)).map((l) => [l.action, l.actorId, l.targetId])
		).toEqual([
			['suspend_user', mod.id, author.id],
			['unsuspend_user', mod.id, author.id]
		]);
	});

	it('never applies to staff, the archive, or missing members', async () => {
		await expect(suspendUser(db, mod.id, mod.id)).rejects.toThrow(ForbiddenError);
		const archive = await makeUser(db, { isArchive: true });
		await expect(suspendUser(db, mod.id, archive.id)).rejects.toThrow(NotFoundError);
		await expect(suspendUser(db, mod.id, 9999)).rejects.toThrow(NotFoundError);
		await expect(unsuspendUser(db, mod.id, 9999)).rejects.toThrow(NotFoundError);
		expect(await db.select().from(moderationLog)).toEqual([]);
	});
});
