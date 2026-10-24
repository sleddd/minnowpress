import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { challenges, stories } from './db/schema';
import {
	activeFeed,
	archiveAuthorFeed,
	authorFeed,
	challengeFeed,
	followingFeed,
	latestFeed,
	memberFeed,
	ftsQuery,
	likePattern,
	SEARCH_MAX_TERMS,
	popularFeed,
	PAGE_SIZE,
	storySearchFeed,
	tagFeed
} from './feeds';
import { follow } from './social';
import { createStory, deleteStory, updateStory, type StoryInput } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let alice: { id: number };
let bob: { id: number };

const input = (o: Partial<StoryInput> = {}): StoryInput => ({
	title: 'T',
	body: 'B' + PAD,
	tags: [],
	publish: true,
	...o
});

const ids = (feed: { items: { id: number }[] }) => feed.items.map((s) => s.id);

beforeEach(async () => {
	db = await createTestDb();
	alice = await makeUser(db);
	bob = await makeUser(db);
});

describe('latestFeed', () => {
	it('lists published stories newest first with author and tags', async () => {
		const a = await createStory(db, alice.id, input({ tags: ['sea'] }));
		const b = await createStory(db, bob.id, input());
		await createStory(db, bob.id, input({ publish: false }));
		const feed = await latestFeed(db);
		expect(ids(feed)).toEqual([b.id, a.id]);
		expect(feed.items[1].author.id).toBe(alice.id);
		expect(feed.items[1].tags).toEqual(['sea']);
		expect(feed.hasMore).toBe(false);
	});

	it('hides mature stories unless the viewer opts in', async () => {
		const m = await createStory(db, alice.id, input({ isMature: true }));
		expect(ids(await latestFeed(db))).toEqual([]);
		expect(ids(await latestFeed(db, { viewer: { id: bob.id, showMature: false } }))).toEqual([]);
		expect(ids(await latestFeed(db, { viewer: { id: bob.id, showMature: true } }))).toEqual([m.id]);
	});

	it('paginates', async () => {
		// Two authors, so neither hits the hourly story limit.
		for (let i = 0; i < PAGE_SIZE + 2; i++)
			await createStory(db, i % 2 ? alice.id : bob.id, input());
		const first = await latestFeed(db);
		const second = await latestFeed(db, { page: 2 });
		expect(first.items).toHaveLength(PAGE_SIZE);
		expect(first.hasMore).toBe(true);
		expect(second.items).toHaveLength(2);
		expect(second.page).toBe(2);
		expect((await latestFeed(db, { page: -3 })).page).toBe(1);
	});
});

describe('activeFeed', () => {
	it('orders by activity score and skips unscored stories', async () => {
		const a = await createStory(db, alice.id, input());
		const b = await createStory(db, alice.id, input());
		await createStory(db, alice.id, input());
		await db.update(stories).set({ activityScore: 1 }).where(eq(stories.id, a.id));
		await db.update(stories).set({ activityScore: 2 }).where(eq(stories.id, b.id));
		expect(ids(await activeFeed(db))).toEqual([b.id, a.id]);
	});
});

describe('followingFeed', () => {
	it('shows only stories by people the user follows', async () => {
		const carol = await makeUser(db);
		const a = await createStory(db, alice.id, input());
		await createStory(db, carol.id, input());
		await follow(db, bob.id, alice.id);
		expect(ids(await followingFeed(db, bob.id))).toEqual([a.id]);
		expect(ids(await followingFeed(db, carol.id))).toEqual([]);
	});
});

describe('tagFeed', () => {
	it('shows stories with the tag', async () => {
		const a = await createStory(db, alice.id, input({ tags: ['ghost'] }));
		await createStory(db, alice.id, input({ tags: ['sea'] }));
		const b = await createStory(db, alice.id, input({ tags: ['ghost'] }));
		expect(ids(await tagFeed(db, 'ghost'))).toEqual([b.id, a.id]);
		expect(ids(await tagFeed(db, 'none'))).toEqual([]);
	});
});

describe('challengeFeed and authorFeed', () => {
	it('filter by challenge and by author', async () => {
		const [c] = await db
			.insert(challenges)
			.values({
				title: 'C',
				promptText: 'p',
				source: 'ai',
				status: 'approved',
				startsAt: new Date(0)
			})
			.returning();
		const entry = await createStory(db, alice.id, input({ challengeId: c.id }));
		const other = await createStory(db, bob.id, input());
		expect(ids(await challengeFeed(db, c.id))).toEqual([entry.id]);
		expect(ids(await authorFeed(db, bob.id))).toEqual([other.id]);
	});
});

describe('pageSize', () => {
	it('limits a page to the requested size', async () => {
		for (let i = 0; i < 4; i++) await createStory(db, alice.id, input());
		const feed = await latestFeed(db, { pageSize: 3 });
		expect(feed.items).toHaveLength(3);
		expect(feed.hasMore).toBe(true);
	});
});

describe('archiveAuthorFeed', () => {
	it('lists stories credited to one archive author', async () => {
		const a = await createStory(db, alice.id, input());
		await createStory(db, alice.id, input());
		await db
			.update(stories)
			.set({
				archiveId: 1,
				archiveUrl: 'u',
				archiveAuthor: 'Kevin',
				archiveAuthorUrl: 'https://ficly.com/authors/kevin/'
			})
			.where(eq(stories.id, a.id));
		expect(ids(await archiveAuthorFeed(db, 'https://ficly.com/authors/kevin/'))).toEqual([a.id]);
	});
});

describe('memberFeed', () => {
	it('lists stories written here, leaving out the Ficly archive', async () => {
		const mine = await createStory(db, alice.id, input());
		const imported = await createStory(db, alice.id, input());
		const old = await createStory(db, alice.id, input());
		await db
			.update(stories)
			.set({ archiveId: 1, archiveUrl: 'u', publishedAt: new Date('2012-05-01') })
			.where(eq(stories.id, imported.id));
		// Belt and braces: a story dated in the archive's years is the archive's.
		await db
			.update(stories)
			.set({ publishedAt: new Date('2013-01-01') })
			.where(eq(stories.id, old.id));
		expect(ids(await memberFeed(db))).toEqual([mine.id]);
		expect(ids(await latestFeed(db))).toEqual([mine.id, old.id, imported.id]);
	});
});

describe('storySearchFeed', () => {
	it('matches titles and text, case-insensitively', async () => {
		const a = await createStory(db, alice.id, input({ title: 'The Lighthouse', body: 'x' + PAD }));
		const b = await createStory(
			db,
			alice.id,
			input({ title: 'Other', body: 'a lighthouse keeper' + PAD })
		);
		await createStory(db, alice.id, input({ title: 'Nope', body: 'nothing here' + PAD }));
		expect(ids(await storySearchFeed(db, 'LIGHTHOUSE')).sort()).toEqual([a.id, b.id].sort());
	});

	it('matches word prefixes, ignores accents, and needs every word', async () => {
		const a = await createStory(db, alice.id, input({ title: 'Café Owl', body: 'x' + PAD }));
		await createStory(db, alice.id, input({ title: 'Owl', body: 'no coffee here' + PAD }));
		await createStory(db, alice.id, input({ title: 'Nothing', body: 'at all' + PAD }));
		expect(ids(await storySearchFeed(db, 'cafe ow'))).toEqual([a.id]);
		expect(ids(await storySearchFeed(db, 'owl'))).toHaveLength(2);
	});

	it('survives FTS5 syntax and finds nothing for punctuation alone', async () => {
		const a = await createStory(db, alice.id, input({ title: '100% true', body: 'x' + PAD }));
		for (const q of ['100% true', 'true "', '(true)', 'TRUE', '"100', '100*']) {
			expect(ids(await storySearchFeed(db, q)), q).toContain(a.id);
		}
		expect(await storySearchFeed(db, '%%% ---')).toEqual({ items: [], page: 1, hasMore: false });
	});

	it('keeps edits and deletions in the index', async () => {
		const a = await createStory(db, alice.id, input({ title: 'Before', body: 'x' + PAD }));
		await updateStory(db, alice.id, a.id, input({ title: 'After', body: 'x' + PAD }));
		expect(ids(await storySearchFeed(db, 'before'))).toEqual([]);
		expect(ids(await storySearchFeed(db, 'after'))).toEqual([a.id]);
		await deleteStory(db, alice.id, a.id);
		expect(ids(await storySearchFeed(db, 'after'))).toEqual([]);
	});
});

describe('likePattern', () => {
	it('escapes LIKE wildcards and backslashes', () => {
		expect(likePattern('50%_off\\')).toBe('%50\\%\\_off\\\\%');
	});
});

describe('ftsQuery', () => {
	it('quotes each word as a prefix term and drops FTS5 syntax', () => {
		expect(ftsQuery('Owl "suit')).toBe('"Owl"* "suit"*');
		expect(ftsQuery('a OR (b) NOT c*')).toBe('"a"* "OR"* "b"* "NOT"* "c"*');
		expect(ftsQuery('  %%% --- ')).toBeNull();
		expect(ftsQuery('')).toBeNull();
		expect(
			ftsQuery(Array.from({ length: 20 }, (_, i) => `w${i}`).join(' '))?.split(' ')
		).toHaveLength(SEARCH_MAX_TERMS);
	});
});

describe('popularFeed', () => {
	it('ranks rated stories by a Bayesian average, skipping unrated ones', async () => {
		const one = await createStory(db, alice.id, input());
		const many = await createStory(db, alice.id, input());
		await createStory(db, alice.id, input());
		await db
			.update(stories)
			.set({ ratingsCount: 1, ratingsTotal: 5 })
			.where(eq(stories.id, one.id));
		await db
			.update(stories)
			.set({ ratingsCount: 20, ratingsTotal: 96 })
			.where(eq(stories.id, many.id));
		const feed = await popularFeed(db);
		expect(ids(feed)).toEqual([many.id, one.id]);
		expect(feed.items[0].averageRating).toBe(4.8);
		expect(feed.items[0].ratingsCount).toBe(20);
	});
});
