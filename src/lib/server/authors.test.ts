import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	authorsToFollow,
	getArchiveAuthor,
	countWriters,
	listArchiveAuthors,
	refreshAllAuthorCounts,
	refreshArchiveAuthors,
	listFollowing,
	listWriters
} from './authors';
import type { DB } from './db/client';
import { archiveAuthors, stories, users } from './db/schema';
import { follow, followArchiveAuthor } from './social';
import {
	countPublishedStories,
	createStory,
	deleteStory,
	publishStory,
	removeStory,
	restoreStory,
	updateStory
} from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
const input = { title: 'T', body: 'B' + PAD, tags: [], publish: true };

async function archiveStory(author: string, slug: string) {
	const archive = await makeUser(db, { isArchive: true });
	const s = await createStory(db, archive.id, input);
	await db
		.update(stories)
		.set({
			archiveId: s.id,
			archiveUrl: 'u',
			archiveAuthor: author,
			archiveAuthorUrl: `https://ficly.com/authors/${slug}/`
		})
		.where(eq(stories.id, s.id));
	return archive;
}

beforeEach(async () => {
	db = await createTestDb();
});

describe('listWriters', () => {
	it('lists members with published stories, most prolific first', async () => {
		const a = await makeUser(db, { displayName: 'Alice', username: 'alice' });
		const b = await makeUser(db, { displayName: 'Bob', username: 'bob' });
		await makeUser(db, { displayName: 'Lurker' });
		await createStory(db, a.id, input);
		await createStory(db, b.id, input);
		await createStory(db, b.id, input);
		await createStory(db, a.id, { ...input, publish: false });
		const { items, hasMore } = await listWriters(db);
		expect(items).toEqual([
			{ name: 'Bob', username: 'bob', href: '/@bob', stories: 2, avatarUrl: null, archive: false },
			{
				name: 'Alice',
				username: 'alice',
				href: '/@alice',
				stories: 1,
				avatarUrl: null,
				archive: false
			}
		]);
		expect(hasMore).toBe(false);
		expect(await countWriters(db)).toBe(2);
	});

	it('excludes the archive account, filters by name, and paginates', async () => {
		await archiveStory('Kevin', 'kevin');
		const a = await makeUser(db, { displayName: 'Alice', username: 'alice' });
		const b = await makeUser(db, { displayName: 'Bob', username: 'bob' });
		await createStory(db, a.id, input);
		await createStory(db, b.id, input);
		expect((await listWriters(db)).items.map((w) => w.name)).toEqual(['Alice', 'Bob']);
		expect((await listWriters(db, { query: 'ali' })).items.map((w) => w.name)).toEqual(['Alice']);
		const first = await listWriters(db, { pageSize: 1 });
		expect(first.hasMore).toBe(true);
		expect((await listWriters(db, { pageSize: 1, page: 2 })).items[0].name).toBe('Bob');
		expect((await listWriters(db, { exclude: [a.id] })).items.map((w) => w.name)).toEqual(['Bob']);
	});
});

describe('archive authors', () => {
	it('lists and finds archive authors by slug', async () => {
		await archiveStory('Kevin Lawver', 'kevin-lawver');
		await archiveStory('Kevin Lawver', 'kevin-lawver');
		await archiveStory('Henjo', 'henjo');
		// Nothing is listed until the summary is built (the import and the nightly job do this).
		expect((await listArchiveAuthors(db)).items).toEqual([]);
		expect(await getArchiveAuthor(db, 'kevin-lawver')).toBeNull();
		await refreshArchiveAuthors(db);
		const { items } = await listArchiveAuthors(db);
		expect(items).toEqual([
			{
				name: 'Kevin Lawver',
				href: '/authors/ficly/kevin-lawver',
				stories: 2,
				avatarUrl: null,
				archive: true
			},
			{ name: 'Henjo', href: '/authors/ficly/henjo', stories: 1, avatarUrl: null, archive: true }
		]);
		// Search matches the start of a name, in any case; not the middle.
		expect((await listArchiveAuthors(db, { query: 'hen' })).items.map((a) => a.name)).toEqual([
			'Henjo'
		]);
		expect((await listArchiveAuthors(db, { query: 'HEN' })).items.map((a) => a.name)).toEqual([
			'Henjo'
		]);
		expect((await listArchiveAuthors(db, { query: 'enjo' })).items).toEqual([]);
		expect((await listArchiveAuthors(db, { query: '  ' })).items.map((a) => a.name)).toEqual([
			'Kevin Lawver',
			'Henjo'
		]);
		expect(await getArchiveAuthor(db, 'KEVIN-lawver')).toEqual({
			name: 'Kevin Lawver',
			url: 'https://ficly.com/authors/kevin-lawver/',
			stories: 2,
			firstYear: expect.any(Number),
			lastYear: expect.any(Number)
		});
		expect(await getArchiveAuthor(db, 'nobody')).toBeNull();
	});
});

describe('authorsToFollow', () => {
	it('suggests members the viewer does not follow, topped up with archive authors', async () => {
		await archiveStory('Kevin', 'kevin');
		await refreshArchiveAuthors(db);
		const viewer = await makeUser(db, { displayName: 'Viewer' });
		const a = await makeUser(db, { displayName: 'Alice', username: 'alice' });
		const b = await makeUser(db, { displayName: 'Bob', username: 'bob' });
		await createStory(db, viewer.id, input);
		await createStory(db, a.id, input);
		await createStory(db, b.id, input);
		await follow(db, viewer.id, b.id);
		const list = await authorsToFollow(db, { viewerId: viewer.id, limit: 3 });
		expect(list.map((x) => x.name)).toEqual(['Alice', 'Kevin']);
		expect(list[1].archive).toBe(true);
	});

	it('returns only members when there are enough', async () => {
		const a = await makeUser(db);
		const b = await makeUser(db);
		await createStory(db, a.id, input);
		await createStory(db, b.id, input);
		await archiveStory('Kevin', 'kevin');
		expect((await authorsToFollow(db, { limit: 2 })).every((x) => !x.archive)).toBe(true);
	});
});

describe('listFollowing', () => {
	it('lists the members a user follows with their published story counts', async () => {
		const me = await makeUser(db);
		const ana = await makeUser(db, { username: 'ana', displayName: 'Ana' });
		const bo = await makeUser(db, { username: 'bo', displayName: 'Bo' });
		await makeUser(db, { username: 'cy' });
		await createStory(db, ana.id, { title: 'T', body: 'B' + PAD, tags: [], publish: true });
		await createStory(db, ana.id, { title: 'D', body: 'B' + PAD, tags: [], publish: false });
		await follow(db, me.id, ana.id);
		await follow(db, me.id, bo.id);
		const list = await listFollowing(db, me.id);
		expect(list.map((a) => [a.name, a.href, a.stories]).sort()).toEqual([
			['Ana', '/@ana', 1],
			['Bo', '/@bo', 0]
		]);
		expect(await listFollowing(db, ana.id)).toEqual([]);
	});
	it('includes followed Ficly archive authors', async () => {
		const me = await makeUser(db);
		const url = 'https://ficly.com/authors/kevin/';
		await db.insert(archiveAuthors).values({ url, name: 'Kevin', stories: 68 });
		await followArchiveAuthor(db, me.id, url);
		expect(await listFollowing(db, me.id)).toEqual([
			{
				name: 'Kevin',
				href: '/authors/ficly/kevin',
				stories: 68,
				avatarUrl: null,
				archive: true
			}
		]);
	});
});

describe('published story counts', () => {
	const count = async (id: number) =>
		(await db.query.users.findFirst({ where: eq(users.id, id) }))!.publishedCount;

	it('follow drafts, publishing, editing, removing, restoring and deleting', async () => {
		const a = await makeUser(db);
		const mod = await makeUser(db, { role: 'mod' });
		const draft = await createStory(db, a.id, { ...input, publish: false });
		expect(await count(a.id)).toBe(0);
		await publishStory(db, a.id, draft.id);
		expect(await count(a.id)).toBe(1);
		const second = await createStory(db, a.id, input);
		expect(await count(a.id)).toBe(2);
		expect(await countPublishedStories(db, a.id)).toBe(2);
		await removeStory(db, second.id, mod.id);
		expect(await count(a.id)).toBe(1);
		await restoreStory(db, second.id, mod.id);
		expect(await count(a.id)).toBe(2);
		await deleteStory(db, a.id, second.id);
		expect(await count(a.id)).toBe(1);
		// An edit that keeps the story published leaves the count alone; publishing a draft bumps it.
		const other = await createStory(db, a.id, { ...input, publish: false });
		await updateStory(db, a.id, other.id, { ...input, publish: true });
		expect(await count(a.id)).toBe(2);
		await updateStory(db, a.id, other.id, { ...input, title: 'Renamed', publish: true });
		expect(await count(a.id)).toBe(2);
		expect(await countPublishedStories(db, 9999)).toBe(0);
	});

	it('can be rebuilt from scratch', async () => {
		const a = await makeUser(db);
		await createStory(db, a.id, input);
		await db.update(users).set({ publishedCount: 99 });
		await refreshAllAuthorCounts(db);
		expect(await count(a.id)).toBe(1);
	});
});
