import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { createStory, removeStory } from './stories';
import { popularTags, tagIndex, TAGS_PAGE_SIZE } from './tags';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let author: { id: number };
const story = (tags: string[], o = {}) =>
	createStory(db, author.id, { title: 'T', body: 'B' + PAD, tags, publish: true, ...o });

beforeEach(async () => {
	db = await createTestDb();
	author = await makeUser(db);
});

describe('popularTags', () => {
	it('ranks tags by published, non-mature stories', async () => {
		await story(['sea', 'ghosts']);
		await story(['sea']);
		await story(['horror'], { isMature: true });
		await story(['draft-only'], { publish: false });
		const removed = await story(['gone']);
		await removeStory(db, removed.id, author.id);
		expect(await popularTags(db)).toEqual([
			{ name: 'sea', count: 2 },
			{ name: 'ghosts', count: 1 }
		]);
		expect(await popularTags(db, 1)).toEqual([{ name: 'sea', count: 2 }]);
	});
});

describe('tagIndex', () => {
	it('lists every tag in use, including mature, and filters by name', async () => {
		await story(['sea']);
		await story(['horror'], { isMature: true });
		const all = await tagIndex(db);
		expect(all.items.map((t) => t.name).sort()).toEqual(['horror', 'sea']);
		expect(all.hasMore).toBe(false);
		expect((await tagIndex(db, { query: 'hor' })).items).toEqual([{ name: 'horror', count: 1 }]);
		expect((await tagIndex(db, { page: 0 })).page).toBe(1);
		expect(TAGS_PAGE_SIZE).toBeGreaterThan(50);
	});
});
