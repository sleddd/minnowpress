import { describe, expect, it } from 'vitest';
import { comments, reports, stories } from './db/schema';
import { HOURLY_LIMITS, underHourlyLimit } from './limits';
import { createTestDb, makeUser } from './testing/db';

const NOW = new Date('2026-10-22T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe('underHourlyLimit', () => {
	it('counts only the member’s own posts from the past hour', async () => {
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
				...Array.from({ length: limit - 1 }, () => story(me.id, minutesAgo(10))),
				story(me.id, minutesAgo(61)),
				story(other.id, minutesAgo(5))
			]);
		expect(await underHourlyLimit(db, 'story', me.id, NOW)).toBe(true);
		await db.insert(stories).values(story(me.id, minutesAgo(1)));
		expect(await underHourlyLimit(db, 'story', me.id, NOW)).toBe(false);
		expect(await underHourlyLimit(db, 'story', other.id, NOW)).toBe(true);
	});

	it('limits comments and reports separately', async () => {
		const db = await createTestDb();
		const [me, author] = [await makeUser(db), await makeUser(db)];
		const [s] = await db
			.insert(stories)
			.values({ authorId: author.id, title: 'T', body: 'B', status: 'published' })
			.returning();
		await db.insert(comments).values(
			Array.from({ length: HOURLY_LIMITS.comment }, () => ({
				storyId: s.id,
				authorId: me.id,
				body: 'hi',
				createdAt: minutesAgo(1)
			}))
		);
		expect(await underHourlyLimit(db, 'comment', me.id, NOW)).toBe(false);
		expect(await underHourlyLimit(db, 'report', me.id, NOW)).toBe(true);
		await db.insert(reports).values(
			Array.from({ length: HOURLY_LIMITS.report }, (_, i) => ({
				reporterId: me.id,
				targetType: 'story' as const,
				targetId: s.id + i,
				reason: 'spam' as const,
				createdAt: minutesAgo(1)
			}))
		);
		expect(await underHourlyLimit(db, 'report', me.id, NOW)).toBe(false);
	});
});
