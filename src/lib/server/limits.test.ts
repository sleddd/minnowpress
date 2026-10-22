import { describe, expect, it } from 'vitest';
import { comments, reports, stories } from './db/schema';
import { RateLimitError } from './errors';
import { assertUnderHourlyLimit, HOURLY_LIMITS, LIMIT_MESSAGE } from './limits';
import { createTestDb, makeUser } from './testing/db';

const NOW = new Date('2026-10-22T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe('assertUnderHourlyLimit', () => {
	it('counts only the member’s own posts from the past hour, including the newest', async () => {
		const db = await createTestDb();
		const [me, other] = [await makeUser(db), await makeUser(db)];
		const story = (authorId: number, createdAt: Date) => ({
			authorId,
			title: 'T',
			body: 'B',
			createdAt
		});
		const limit = HOURLY_LIMITS.story;
		await db
			.insert(stories)
			.values([
				...Array.from({ length: limit }, () => story(me.id, minutesAgo(10))),
				story(me.id, minutesAgo(61)),
				story(other.id, minutesAgo(5))
			]);
		// Exactly the limit is fine; the row just inserted is one of them.
		await expect(assertUnderHourlyLimit(db, 'story', me.id, NOW)).resolves.toBeUndefined();
		await db.insert(stories).values(story(me.id, minutesAgo(1)));
		const err = await assertUnderHourlyLimit(db, 'story', me.id, NOW).catch((e) => e);
		expect(err).toBeInstanceOf(RateLimitError);
		expect(err.message).toBe(LIMIT_MESSAGE);
		await expect(assertUnderHourlyLimit(db, 'story', other.id, NOW)).resolves.toBeUndefined();
	});

	it('limits comments and reports separately', async () => {
		const db = await createTestDb();
		const [me, author] = [await makeUser(db), await makeUser(db)];
		const [s] = await db
			.insert(stories)
			.values({ authorId: author.id, title: 'T', body: 'B', status: 'published' })
			.returning();
		await db.insert(comments).values(
			Array.from({ length: HOURLY_LIMITS.comment + 1 }, () => ({
				storyId: s.id,
				authorId: me.id,
				body: 'hi',
				createdAt: minutesAgo(1)
			}))
		);
		await expect(assertUnderHourlyLimit(db, 'comment', me.id, NOW)).rejects.toThrow(RateLimitError);
		await expect(assertUnderHourlyLimit(db, 'report', me.id, NOW)).resolves.toBeUndefined();
		await db.insert(reports).values(
			Array.from({ length: HOURLY_LIMITS.report + 1 }, (_, i) => ({
				reporterId: me.id,
				targetType: 'story' as const,
				targetId: s.id + i,
				reason: 'spam' as const,
				createdAt: minutesAgo(1)
			}))
		);
		await expect(assertUnderHourlyLimit(db, 'report', me.id, NOW)).rejects.toThrow(RateLimitError);
	});
});
