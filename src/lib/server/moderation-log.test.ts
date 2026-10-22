import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { moderationLog, users } from './db/schema';
import { listModerationLog, logModeration, MODERATION_LOG_PAGE_SIZE } from './moderation-log';
import { addComment } from './social';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let mod: { id: number };

beforeEach(async () => {
	db = await createTestDb();
	mod = await makeUser(db, { username: 'themod', role: 'mod' });
});

describe('logModeration / listModerationLog', () => {
	it('lists entries newest first, naming the moderator and linking the target', async () => {
		const author = await makeUser(db, { username: 'alice' });
		const story = await createStory(db, author.id, {
			title: 'Flagged',
			body: 'Text' + PAD,
			tags: [],
			publish: true
		});
		const comment = await addComment(db, author.id, story.id, 'hmm');
		await logModeration(db, {
			actorId: mod.id,
			action: 'remove_story',
			targetType: 'story',
			targetId: story.id,
			reportId: null
		});
		await logModeration(db, {
			actorId: mod.id,
			action: 'delete_comment',
			targetType: 'comment',
			targetId: comment.id
		});
		await logModeration(db, {
			actorId: mod.id,
			action: 'suspend_user',
			targetType: 'user',
			targetId: author.id
		});
		const { items, page, hasMore } = await listModerationLog(db);
		expect(page).toBe(1);
		expect(hasMore).toBe(false);
		expect(items.map((i) => [i.action, i.actor, i.target])).toEqual([
			['suspend_user', 'themod', { label: '@alice', href: '/@alice' }],
			['delete_comment', 'themod', { label: `Comment #${comment.id}`, href: `/s/${story.id}` }],
			['remove_story', 'themod', { label: 'Flagged', href: `/s/${story.id}` }]
		]);
		expect(items[0].createdAt).toBeInstanceOf(Date);
		expect(items[2].reportId).toBeNull();
	});

	it('keeps an entry readable when the moderator or the target is gone', async () => {
		const gone = await makeUser(db, { role: 'mod' });
		await logModeration(db, {
			actorId: gone.id,
			action: 'remove_story',
			targetType: 'story',
			targetId: 404
		});
		await logModeration(db, {
			actorId: mod.id,
			action: 'delete_comment',
			targetType: 'comment',
			targetId: 405
		});
		await logModeration(db, {
			actorId: mod.id,
			action: 'unsuspend_user',
			targetType: 'user',
			targetId: 406
		});
		await db.delete(users).where(eq(users.id, gone.id));
		const { items } = await listModerationLog(db);
		expect(items.map((i) => [i.actor, i.target])).toEqual([
			['themod', { label: 'Member #406', href: null }],
			['themod', { label: 'Comment #405', href: null }],
			[null, { label: 'Story #404', href: null }]
		]);
		// The row itself survives the moderator's account.
		expect((await db.select().from(moderationLog)).find((r) => r.targetId === 404)?.actorId).toBe(
			null
		);
	});

	it('pages', async () => {
		await db.insert(moderationLog).values(
			Array.from({ length: MODERATION_LOG_PAGE_SIZE + 1 }, (_, i) => ({
				actorId: mod.id,
				action: 'dismiss_report' as const,
				targetType: 'story' as const,
				targetId: i + 1
			}))
		);
		const first = await listModerationLog(db);
		expect(first.items).toHaveLength(MODERATION_LOG_PAGE_SIZE);
		expect(first.hasMore).toBe(true);
		const second = await listModerationLog(db, { page: 2 });
		expect(second.items).toHaveLength(1);
		expect(second.hasMore).toBe(false);
		expect((await listModerationLog(db, { page: 0 })).page).toBe(1);
	});
});
