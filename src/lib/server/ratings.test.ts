import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { stories } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { getUserRating, rateStory } from './ratings';
import { createStory, removeStory } from './stories';
import { createTestDb, makeUser } from './testing/db';

let db: DB;
let author: { id: number };
let reader: { id: number };
let storyId: number;

beforeEach(async () => {
	db = await createTestDb();
	author = await makeUser(db);
	reader = await makeUser(db);
	storyId = (
		await createStory(db, author.id, { title: 'T', body: 'x'.repeat(80), tags: [], publish: true })
	).id;
});

describe('rateStory', () => {
	it('records a rating and updates the totals', async () => {
		expect(await rateStory(db, reader.id, storyId, 4)).toEqual({ score: 4, count: 1, average: 4 });
		expect(await getUserRating(db, reader.id, storyId)).toBe(4);
		const other = await makeUser(db);
		expect(await rateStory(db, other.id, storyId, 5)).toEqual({ score: 5, count: 2, average: 4.5 });
	});

	it('replaces an earlier rating instead of adding another', async () => {
		await rateStory(db, reader.id, storyId, 2);
		expect(await rateStory(db, reader.id, storyId, 5)).toEqual({ score: 5, count: 1, average: 5 });
	});

	it('adds member ratings on top of the archive baseline', async () => {
		await db
			.update(stories)
			.set({ archiveRatingsCount: 20, archiveRatingsTotal: 92, ratingsCount: 20, ratingsTotal: 92 })
			.where(eq(stories.id, storyId));
		expect(await rateStory(db, reader.id, storyId, 1)).toEqual({
			score: 1,
			count: 21,
			average: 4.4
		});
	});

	it('rejects bad scores, own stories, and unpublished stories', async () => {
		await expect(rateStory(db, reader.id, storyId, 6)).rejects.toThrow(ValidationError);
		await expect(rateStory(db, reader.id, storyId, 0)).rejects.toThrow(ValidationError);
		await expect(rateStory(db, author.id, storyId, 5)).rejects.toThrow(ForbiddenError);
		await expect(rateStory(db, reader.id, 999, 5)).rejects.toThrow(NotFoundError);
		await removeStory(db, storyId);
		await expect(rateStory(db, reader.id, storyId, 5)).rejects.toThrow(NotFoundError);
	});

	it('has no rating for a reader who has not rated', async () => {
		expect(await getUserRating(db, reader.id, storyId)).toBeNull();
	});
});
