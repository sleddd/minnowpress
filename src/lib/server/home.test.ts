import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { stories } from './db/schema';
import { ARCHIVE_PICKS_POOL, COLUMN_SIZE, homeColumns, POPULAR_POOL } from './home';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let author: { id: number };

beforeEach(async () => {
	db = await createTestDb();
	author = await makeUser(db);
});

/** An archive story with the given rating; a higher `rank` rates better. */
async function archiveStory(rank: number, rated = true) {
	const [story] = await db
		.insert(stories)
		.values({
			authorId: author.id,
			title: `Archive ${rank}`,
			body: 'Text' + PAD,
			status: 'published',
			archiveId: rank,
			archiveUrl: `u${rank}`,
			publishedAt: new Date('2012-01-01'),
			ratingsCount: rated ? 10 + rank : 0,
			ratingsTotal: rated ? 5 * (10 + rank) : 0
		})
		.returning();
	return story;
}

async function memberStory(title: string) {
	const [story] = await db
		.insert(stories)
		.values({
			authorId: author.id,
			title,
			body: 'Text' + PAD,
			status: 'published',
			publishedAt: new Date()
		})
		.returning();
	return story;
}

describe('homeColumns', () => {
	it('tops Recent up with well-rated archive stories, never the ones under Popular', async () => {
		const ranked = [];
		for (let rank = POPULAR_POOL + 10; rank > 0; rank--) ranked.push(await archiveStory(rank));
		await archiveStory(0, false);
		const fresh = await memberStory('Fresh');

		const columns = await homeColumns(db, null);
		expect(columns.popular).toHaveLength(COLUMN_SIZE);
		const best = new Set(ranked.slice(0, POPULAR_POOL).map((s) => s.id));
		expect(columns.popular.every((s) => best.has(s.id))).toBe(true);

		expect(columns.recent).toHaveLength(COLUMN_SIZE);
		expect(columns.recent[0].id).toBe(fresh.id);
		const nextBest = new Set(ranked.slice(POPULAR_POOL).map((s) => s.id));
		expect(columns.recent.slice(1).every((s) => nextBest.has(s.id))).toBe(true);
		expect(columns.recentHasArchivePicks).toBe(true);
		expect(ARCHIVE_PICKS_POOL).toBeGreaterThan(POPULAR_POOL);
	});

	it('shows only stories written here once there are enough', async () => {
		for (let rank = 1; rank <= 10; rank++) await archiveStory(rank);
		const fresh = [];
		for (let i = 0; i < COLUMN_SIZE + 2; i++) {
			const story = await memberStory(`Fresh ${i}`);
			await db
				.update(stories)
				.set({ publishedAt: new Date(Date.UTC(2026, 0, 1 + i)) })
				.where(eq(stories.id, story.id));
			fresh.push(story);
		}

		const columns = await homeColumns(db, null);
		expect(columns.recent.map((s) => s.id)).toEqual(
			fresh
				.slice(-COLUMN_SIZE)
				.reverse()
				.map((s) => s.id)
		);
		expect(columns.recentHasArchivePicks).toBe(false);
	});
});
