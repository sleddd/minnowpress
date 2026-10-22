import { eq, isNotNull } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from '../db/client';
import { challenges, stories, users } from '../db/schema';
import { latestFeed } from '../feeds';
import { continueStory, getChain, getStory, tagsFor } from '../stories';
import { PAD, createTestDb, makeUser } from '../testing/db';
import {
	ARCHIVE_EMAIL,
	chainRoots,
	ensureArchiveUser,
	importFicly,
	mysqlDate,
	readFiclyDump
} from './ficly';

const STORY_COLS =
	'(`id`, `title`, `body`, `published_at`, `is_draft`, `tags`, `sequel_to`, `prequel_to`, `user_id`, `is_deleted`, `is_mature`)';

/** A miniature dump in the same format as ficly_export.sql. */
const FIXTURE = [
	'INSERT INTO `users` (`id`, `name`, `uri_name`, `login_key`)',
	'VALUES',
	"\t(1,'Kevin Lawver','kevin-lawver',NULL),",
	"\t(2,'Jane Q','',NULL);",
	'INSERT INTO `challenges` (`id`, `title`, `body`, `starts_at`, `ends_at`, `created_at`)',
	'VALUES',
	"\t(5,'When the Lights Go Out','Write about the power going out.\\r\\n\\r\\nAny cause.','2009-05-20 00:00:00','2009-06-20 00:00:00','2009-05-19 00:00:00');",
	`INSERT INTO \`stories\` ${STORY_COLS}`,
	'VALUES',
	"\t(10,'Test','\\\"This is only a test.\\\"\\r\\nOk.','2009-05-16 20:41:33',0,NULL,NULL,NULL,1,0,0),",
	"\t(11,'After','The sequel.','2009-05-17 10:00:00',0,NULL,10,NULL,2,0,1),",
	"\t(12,'Before','The prequel.','2009-05-18 10:00:00',0,NULL,NULL,10,2,0,0),",
	"\t(13,'Orphan','Parent was deleted.','2009-05-19 10:00:00',0,NULL,99,NULL,9,0,0),",
	"\t(14,'Draft','Never published.',NULL,1,NULL,NULL,NULL,1,0,0),",
	"\t(15,'Deleted','Gone.','2009-05-19 10:00:00',0,NULL,NULL,NULL,1,1,0),",
	"\t(16,'',' Untitled body ','2009-05-20 10:00:00',0,NULL,11,NULL,1,0,0);",
	'INSERT INTO `challenge_submissions` (`id`, `story_id`, `challenge_id`)',
	'VALUES',
	'\t(1,11,5);',
	'INSERT INTO `tags` (`id`, `name`, `cleaned_tag`)',
	'VALUES',
	"\t(1,'Sci Fi','scifi'),",
	"\t(2,'humor','humor');",
	'INSERT INTO `taggings` (`id`, `tag_id`, `taggable_id`, `taggable_type`)',
	'VALUES',
	"\t(1,1,10,'Story'),",
	"\t(2,2,10,'Story'),",
	"\t(3,2,10,'BlogPost');"
];

describe('mysqlDate', () => {
	it('reads MySQL datetimes as UTC', () => {
		expect(mysqlDate('2009-05-16 20:41:33')?.toISOString()).toBe('2009-05-16T20:41:33.000Z');
	});

	it('rejects missing, malformed, and zero dates', () => {
		expect(mysqlDate(null)).toBeNull();
		expect(mysqlDate('yesterday')).toBeNull();
		expect(mysqlDate('0000-00-00 00:00:00')).toBeNull();
		expect(mysqlDate('2009-13-45 99:00:00')).toBeNull();
	});
});

describe('chainRoots', () => {
	it('finds the root of each chain', () => {
		const roots = chainRoots(
			new Map([
				[1, null],
				[2, 1],
				[3, 2],
				[4, 99],
				[5, null]
			])
		);
		expect(Object.fromEntries(roots)).toEqual({ 1: 1, 2: 1, 3: 1, 4: 4, 5: 5 });
	});

	it('breaks cycles instead of looping forever', () => {
		const roots = chainRoots(
			new Map([
				[1, 2],
				[2, 1]
			])
		);
		expect(roots.size).toBe(2);
		expect([1, 2]).toContain(roots.get(1));
	});
});

describe('readFiclyDump', () => {
	it('keeps published stories with credits, links, entries, and tags', async () => {
		const dump = await readFiclyDump(FIXTURE);
		expect(dump.stories.map((s) => s.archiveId)).toEqual([10, 11, 12, 13, 16]);
		const [test, after, before, orphan, untitled] = dump.stories;
		expect(test).toMatchObject({
			title: 'Test',
			body: '"This is only a test."\nOk.',
			author: 'Kevin Lawver',
			authorUrl: 'https://ficly.com/authors/kevin-lawver/',
			parentArchiveId: null,
			relation: null,
			tags: ['sci-fi', 'humor']
		});
		expect(after).toMatchObject({
			parentArchiveId: 10,
			relation: 'sequel',
			isMature: true,
			challengeArchiveId: 5,
			author: 'Jane Q',
			authorUrl: null
		});
		expect(before).toMatchObject({ parentArchiveId: 10, relation: 'prequel' });
		expect(orphan).toMatchObject({ parentArchiveId: 99, author: 'Unknown' });
		expect(untitled).toMatchObject({ title: 'Untitled', body: 'Untitled body' });
		expect(dump.challenges).toEqual([
			{
				archiveId: 5,
				title: 'When the Lights Go Out',
				promptText: 'Write about the power going out.\n\nAny cause.',
				startsAt: new Date('2009-05-20T00:00:00Z'),
				endsAt: new Date('2009-06-20T00:00:00Z')
			}
		]);
	});

	it('handles an empty dump', async () => {
		expect(await readFiclyDump([])).toEqual({ stories: [], challenges: [] });
	});
});

describe('importFicly', () => {
	let db: DB;
	beforeEach(async () => {
		db = await createTestDb();
	});

	const byArchive = async (archiveId: number) =>
		(await db.select().from(stories).where(eq(stories.archiveId, archiveId)))[0];

	it('imports stories owned by the archive account and credited to their authors', async () => {
		const logs: string[] = [];
		const result = await importFicly(db, await readFiclyDump(FIXTURE), {
			batchSize: 2,
			log: (m) => logs.push(m)
		});
		expect(result).toEqual({ stories: 5, challenges: 1, linked: 3 });
		expect(logs.length).toBeGreaterThan(0);

		const archive = await db.query.users.findFirst({ where: eq(users.isArchive, true) });
		expect(archive?.email).toBe(ARCHIVE_EMAIL);

		const test = await byArchive(10);
		const detail = await getStory(db, test.id);
		expect(detail?.author.id).toBe(archive?.id);
		expect(detail?.archive).toEqual({
			url: 'https://ficly.com/stories/10/',
			author: 'Kevin Lawver',
			authorUrl: 'https://ficly.com/authors/kevin-lawver/'
		});
		expect(detail?.publishedAt?.toISOString()).toBe('2009-05-16T20:41:33.000Z');
		expect((await tagsFor(db, [test.id])).get(test.id)).toEqual(['humor', 'sci-fi']);
	});

	it('rebuilds prequel/sequel links, chains, and challenge entries', async () => {
		await importFicly(db, await readFiclyDump(FIXTURE));
		const [test, after, before, orphan, untitled] = await Promise.all(
			[10, 11, 12, 13, 16].map(byArchive)
		);
		expect(after).toMatchObject({
			parentId: test.id,
			relation: 'sequel',
			chainId: test.id,
			isMature: true
		});
		expect(before).toMatchObject({ parentId: test.id, relation: 'prequel', chainId: test.id });
		expect(untitled).toMatchObject({ parentId: after.id, chainId: test.id });
		expect(orphan).toMatchObject({ parentId: null, relation: null, chainId: orphan.id });
		expect((await getChain(db, test.id)).map((s) => s.id).sort()).toEqual(
			[test.id, after.id, before.id, untitled.id].sort()
		);

		const [challenge] = await db.select().from(challenges).where(isNotNull(challenges.archiveId));
		expect(challenge).toMatchObject({
			status: 'approved',
			source: 'human',
			archiveUrl: 'https://ficly.com/challenges/5/'
		});
		expect(after.challengeId).toBe(challenge.id);
	});

	it('is safe to run twice', async () => {
		const dump = await readFiclyDump(FIXTURE);
		await importFicly(db, dump);
		expect(await importFicly(db, dump)).toEqual({ stories: 0, challenges: 0, linked: 3 });
		expect(await db.select().from(stories)).toHaveLength(5);
	});

	it('lets people write new sequels to archive stories, and shows them in feeds', async () => {
		await importFicly(db, await readFiclyDump(FIXTURE));
		const writer = await makeUser(db);
		const test = await byArchive(10);
		const sequel = await continueStory(db, writer.id, test.id, 'sequel', {
			title: 'Years later',
			body: 'Still testing.' + PAD,
			tags: [],
			publish: true
		});
		expect(sequel.chainId).toBe(test.id);
		const feed = await latestFeed(db);
		expect(feed.items[0].id).toBe(sequel.id);
		expect(feed.items.find((s) => s.id === test.id)?.archive?.author).toBe('Kevin Lawver');
	});

	it('reuses an existing archive account', async () => {
		const first = await ensureArchiveUser(db);
		expect((await ensureArchiveUser(db)).id).toBe(first.id);
	});
});

describe('archive ratings', () => {
	it('keeps Ficly ratings as a baseline that member ratings add to', async () => {
		const db = await createTestDb();
		const dump = await readFiclyDump([
			'INSERT INTO `stories` (`id`, `title`, `body`, `published_at`, `is_draft`, `user_id`, `is_deleted`, `ratings_count`, `total_ratings_score`)',
			"\t(1,'Test','Rated on Ficly.','2009-05-16 20:41:33',0,1,0,20,92);"
		]);
		expect(dump.stories[0]).toMatchObject({ ratingsCount: 20, ratingsTotal: 92 });
		await importFicly(db, dump);
		const [story] = await db.select().from(stories);
		expect(story).toMatchObject({
			ratingsCount: 20,
			ratingsTotal: 92,
			archiveRatingsCount: 20,
			archiveRatingsTotal: 92
		});

		const { rateStory } = await import('../ratings');
		const reader = await makeUser(db);
		expect(await rateStory(db, reader.id, story.id, 1)).toMatchObject({ count: 21 });
		await importFicly(db, dump);
		const [again] = await db.select().from(stories);
		expect(again).toMatchObject({ ratingsCount: 21, ratingsTotal: 93 });
	});
});
