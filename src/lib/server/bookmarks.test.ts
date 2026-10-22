import { beforeEach, describe, expect, it } from 'vitest';
import { isBookmarked, toggleBookmark } from './bookmarks';
import type { DB } from './db/client';
import { NotFoundError } from './errors';
import { bookmarksFeed } from './feeds';
import { createStory, removeStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let reader: { id: number };
let author: { id: number };
const input = { title: 'T', body: 'B' + PAD, tags: [], publish: true };

beforeEach(async () => {
	db = await createTestDb();
	reader = await makeUser(db);
	author = await makeUser(db);
});

describe('toggleBookmark', () => {
	it('saves and unsaves a story', async () => {
		const story = await createStory(db, author.id, input);
		expect(await toggleBookmark(db, reader.id, story.id)).toEqual({ bookmarked: true });
		expect(await isBookmarked(db, reader.id, story.id)).toBe(true);
		expect(await toggleBookmark(db, reader.id, story.id)).toEqual({ bookmarked: false });
		expect(await isBookmarked(db, reader.id, story.id)).toBe(false);
	});

	it('refuses missing or unpublished stories', async () => {
		await expect(toggleBookmark(db, reader.id, 999)).rejects.toThrow(NotFoundError);
		const draft = await createStory(db, author.id, { ...input, publish: false });
		await expect(toggleBookmark(db, reader.id, draft.id)).rejects.toThrow(NotFoundError);
	});
});

describe('bookmarksFeed', () => {
	it('lists saved stories, most recently saved first, hiding removed ones', async () => {
		const a = await createStory(db, author.id, input);
		const b = await createStory(db, author.id, input);
		const c = await createStory(db, author.id, input);
		await toggleBookmark(db, reader.id, b.id);
		await new Promise((r) => setTimeout(r, 5));
		await toggleBookmark(db, reader.id, a.id);
		await toggleBookmark(db, reader.id, c.id);
		await removeStory(db, c.id);
		const feed = await bookmarksFeed(db, reader.id);
		expect(feed.items.map((s) => s.id)).toEqual([a.id, b.id]);
		expect((await bookmarksFeed(db, author.id)).items).toEqual([]);
	});
});
