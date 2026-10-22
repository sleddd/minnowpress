import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { stories } from './db/schema';
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from './errors';
import { HOURLY_LIMITS } from './limits';
import { listModerationLog } from './moderation-log';
import {
	addComment,
	deleteComment,
	follow,
	followCounts,
	isFollowing,
	listComments,
	unfollow
} from './social';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let alice: { id: number };
let bob: { id: number };
let storyId: number;

const counts = async () => {
	const [s] = await db.select().from(stories).where(eq(stories.id, storyId));
	return { comments: s.commentsCount };
};

beforeEach(async () => {
	db = await createTestDb();
	alice = await makeUser(db);
	bob = await makeUser(db);
	storyId = (
		await createStory(db, alice.id, { title: 'T', body: 'B' + PAD, tags: [], publish: true })
	).id;
});

describe('follow', () => {
	it('follows, is idempotent, and unfollows', async () => {
		await follow(db, bob.id, alice.id);
		await follow(db, bob.id, alice.id);
		expect(await isFollowing(db, bob.id, alice.id)).toBe(true);
		expect(await followCounts(db, alice.id)).toEqual({ followers: 1, following: 0 });
		expect(await followCounts(db, bob.id)).toEqual({ followers: 0, following: 1 });
		await unfollow(db, bob.id, alice.id);
		expect(await isFollowing(db, bob.id, alice.id)).toBe(false);
	});

	it('rejects following yourself or a missing user', async () => {
		await expect(follow(db, bob.id, bob.id)).rejects.toThrow(ForbiddenError);
		await expect(follow(db, bob.id, 9999)).rejects.toThrow(NotFoundError);
	});
});

describe('comments', () => {
	it('adds comments in order and counts them', async () => {
		await addComment(db, bob.id, storyId, ' First! ');
		await addComment(db, alice.id, storyId, 'Thanks');
		const list = await listComments(db, storyId);
		expect(list.map((c) => c.body)).toEqual(['First!', 'Thanks']);
		expect(list[0].author.id).toBe(bob.id);
		expect((await counts()).comments).toBe(2);
	});

	it('validates the body and the story', async () => {
		await expect(addComment(db, bob.id, storyId, '')).rejects.toThrow(ValidationError);
		await expect(addComment(db, bob.id, 9999, 'hi')).rejects.toThrow(NotFoundError);
	});

	it('lets the author or a moderator delete, and hides deleted comments', async () => {
		const a = await addComment(db, bob.id, storyId, 'one');
		const b = await addComment(db, bob.id, storyId, 'two');
		await expect(deleteComment(db, alice.id, a.id)).rejects.toThrow(ForbiddenError);
		await deleteComment(db, bob.id, a.id);
		await deleteComment(db, alice.id, b.id, { asModerator: true, reportId: null });
		expect(await listComments(db, storyId)).toEqual([]);
		expect((await counts()).comments).toBe(0);
		await expect(deleteComment(db, bob.id, a.id)).rejects.toThrow(NotFoundError);
		// Only the moderator's deletion of someone else's comment is logged.
		const { items } = await listModerationLog(db);
		expect(items.map((i) => [i.action, i.targetId, i.reportId])).toEqual([
			['delete_comment', b.id, null]
		]);
	});

	it('refuses a flood of comments and leaves no trace of the refused one', async () => {
		for (let i = 0; i < HOURLY_LIMITS.comment; i++) await addComment(db, bob.id, storyId, 'hi');
		await expect(addComment(db, bob.id, storyId, 'one more')).rejects.toThrow(RateLimitError);
		expect(await listComments(db, storyId)).toHaveLength(HOURLY_LIMITS.comment);
		expect((await counts()).comments).toBe(HOURLY_LIMITS.comment);
		await expect(addComment(db, alice.id, storyId, 'still fine')).resolves.toBeDefined();
	});
});
