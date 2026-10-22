import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { eq } from 'drizzle-orm';
import { tags } from './db/schema';
import {
	createStory,
	deleteStory,
	publishStory,
	removeStory,
	restoreStory,
	updateStory
} from './stories';
import { popularTags, refreshAllTagCounts, tagIndex, TAGS_PAGE_SIZE } from './tags';
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

describe('tag counts', () => {
	const counts = async (name: string) => {
		const row = await db.query.tags.findFirst({ where: eq(tags.name, name) });
		return row ? [row.publishedCount, row.generalCount] : null;
	};

	it('follow publishing, editing, removing, restoring and deleting', async () => {
		const draft = await story(['sea'], { publish: false });
		expect(await counts('sea')).toEqual([0, 0]);
		await publishStory(db, author.id, draft.id);
		expect(await counts('sea')).toEqual([1, 1]);
		await updateStory(db, author.id, draft.id, {
			title: 'T',
			body: 'B' + PAD,
			tags: ['ocean'],
			isMature: true,
			publish: true
		});
		expect(await counts('sea')).toEqual([0, 0]);
		expect(await counts('ocean')).toEqual([1, 0]);
		await removeStory(db, draft.id, author.id);
		expect(await counts('ocean')).toEqual([0, 0]);
		await restoreStory(db, draft.id, author.id);
		expect(await counts('ocean')).toEqual([1, 0]);
		await deleteStory(db, author.id, draft.id);
		expect(await counts('ocean')).toEqual([0, 0]);
	});

	it('can be rebuilt from scratch', async () => {
		await story(['sea']);
		await db.update(tags).set({ publishedCount: 99, generalCount: 99 });
		await refreshAllTagCounts(db);
		expect(await counts('sea')).toEqual([1, 1]);
	});
});
