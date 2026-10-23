/**
 * Query plans under the archive's skew: one account owns nearly every story. With planner
 * statistics from that shape, member-scoped pages once walked every published story to find
 * a small member's handful, which cost a signed-in visit around 100,000 rows on production.
 * These tests rebuild the skew and check that each page is read from its own index.
 */
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { recentActivity } from './desk';
import * as schema from './db/schema';
import { follows, stories, users } from './db/schema';
import { authorFeed, challengeFeed, followingFeed, latestFeed } from './feeds';

let client: Client;
let ids: { archive: number; me: number; friend: number };

beforeAll(async () => {
	client = createClient({ url: ':memory:' });
	const db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: 'drizzle' });
	const mk = async (username: string, isArchive = false) =>
		(
			await db
				.insert(users)
				.values({ email: `${username}@x.test`, username, displayName: username, isArchive })
				.returning()
		)[0].id;
	ids = { archive: await mk('archive', true), me: await mk('me'), friend: await mk('friend') };
	const at = (i: number) => new Date(Date.UTC(2010, 0, 1) + i * 3_600_000);
	const rows = Array.from({ length: 3000 }, (_, i) => ({
		authorId: ids.archive,
		title: `A${i}`,
		body: 'b',
		status: 'published' as const,
		publishedAt: at(i)
	}));
	for (let i = 0; i < rows.length; i += 500)
		await db.insert(stories).values(rows.slice(i, i + 500));
	const [mine] = await db
		.insert(stories)
		.values({
			authorId: ids.me,
			title: 'Mine',
			body: 'b',
			status: 'published',
			publishedAt: at(5000)
		})
		.returning();
	await db.insert(stories).values([
		{
			authorId: ids.friend,
			title: 'Theirs',
			body: 'b',
			status: 'published',
			publishedAt: at(5001)
		},
		{
			authorId: ids.friend,
			title: 'Sequel',
			body: 'b',
			status: 'published',
			publishedAt: at(5002),
			parentId: mine.id,
			relation: 'sequel'
		}
	]);
	await db.insert(follows).values({ followerId: ids.me, followeeId: ids.friend });
	await client.execute('analyze');
});

/** The plan of every statement `run` sends, one line per statement. */
async function plans(run: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<unknown>) {
	const sent: { sql: string; params: unknown[] }[] = [];
	const db = drizzle(client, {
		schema,
		logger: { logQuery: (sql, params) => void sent.push({ sql, params }) }
	});
	await run(db);
	const out: string[] = [];
	for (const s of sent) {
		const r = await client.execute({ sql: `explain query plan ${s.sql}`, args: s.params as never });
		out.push(r.rows.map((row) => String(row.detail)).join(' | '));
	}
	return out;
}

/** Walking every published story newest first: the plan that cost 32,000 rows a page. */
const walksArchive = (plan: string) =>
	/SEARCH stories USING (COVERING )?INDEX stories_status_published_idx|SEARCH child USING (COVERING )?INDEX stories_status_published_idx|SCAN stories\b/.test(
		plan
	) && !/stories_author_idx|stories_challenge_idx/.test(plan.split('|')[0]);

describe('query plans with one account owning nearly every story', () => {
	it('reads a small member’s profile from the author index', async () => {
		const [feed] = await plans((db) => authorFeed(db, ids.me));
		expect(feed).toMatch(/stories_author_idx/);
		expect(walksArchive(feed)).toBe(false);
	});

	it('reads the archive’s own profile from the author index without sorting it all', async () => {
		const [feed] = await plans((db) => authorFeed(db, ids.archive));
		expect(feed).toMatch(/stories_author_idx/);
		expect(feed).not.toMatch(/USE TEMP B-TREE FOR ORDER BY/);
	});

	it('drives the following feed from the follows, not from every story', async () => {
		const [feed] = await plans((db) => followingFeed(db, ids.me));
		expect(walksArchive(feed)).toBe(false);
		expect(feed).toMatch(/follows/);
		const result = await followingFeed(drizzle(client, { schema }), ids.me);
		expect(result.items.map((s) => s.title)).toEqual(['Sequel', 'Theirs']);
	});

	it('finds continuations of the member’s stories from the member’s stories', async () => {
		const statements = await plans((db) => recentActivity(db, ids.me));
		for (const plan of statements) expect(walksArchive(plan), plan).toBe(false);
		const events = await recentActivity(drizzle(client, { schema }), ids.me);
		expect(events.map((e) => [e.kind, e.continuation?.title])).toEqual([['sequel', 'Sequel']]);
	});

	it('reads a challenge’s entries from the challenge index', async () => {
		const [feed] = await plans((db) => challengeFeed(db, 1));
		expect(feed).toMatch(/stories_challenge_idx/);
	});

	it('still serves the site-wide latest feed from the published index', async () => {
		const [feed] = await plans((db) => latestFeed(db));
		expect(feed).toMatch(/stories_status_published_idx/);
	});
});
