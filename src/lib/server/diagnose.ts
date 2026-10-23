/**
 * Where the database reads go. Replays the statements a page runs against the production
 * database through Turso's HTTP API, which reports rows read per statement, the same figure
 * Turso bills by. Reached through /api/diagnose with the cron secret.
 */
import { createClient, type Client, type InValue } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { eq, sql } from 'drizzle-orm';
import { recomputeActivityScores } from './activity';
import { validateSession } from './auth';
import {
	authorsToFollow,
	getArchiveAuthor,
	countWriters,
	listArchiveAuthors,
	listFollowing,
	listWriters
} from './authors';
import { listPublishedPosts } from './blog';
import {
	countEntries,
	ensureCurrentChallenge,
	getChallenge,
	listChallenges,
	pastChallenges,
	todaysPrompt
} from './challenges';
import * as schema from './db/schema';
import { archiveAuthors, stories, users } from './db/schema';
import { recentActivity, storyCounts } from './desk';
import {
	archiveAuthorFeed,
	authorFeed,
	bookmarksFeed,
	challengeFeed,
	followingFeed,
	latestFeed,
	popularFeed,
	tagFeed
} from './feeds';
import { searchAll } from './search';
import { followCounts, listComments } from './social';
import { countPublishedStories, getChain, getStory, getUserStories } from './stories';
import { popularTags, tagIndex } from './tags';

type DB = LibSQLDatabase<typeof schema>;

export interface Statement {
	sql: string;
	params: unknown[];
}

export interface Measured extends Statement {
	rowsRead: number | null;
	rowsWritten: number | null;
	ms: number | null;
	error?: string;
}

/**
 * What a page does, as the server functions it calls. `db` is recorded; `pick` is the same
 * connection unrecorded, for choosing the heaviest real example (biggest chain, busiest
 * challenge) without that lookup counting against the page.
 */
export const SCENARIOS: Record<string, (db: DB, pick: DB) => Promise<unknown>> = {
	'session check': (db) => validateSession(db, 'not-a-real-token'),
	home: async (db) => {
		await ensureCurrentChallenge(db);
		const opts = { pageSize: 6 };
		const prompt = await todaysPrompt(db);
		await Promise.all([
			popularFeed(db, opts),
			latestFeed(db, opts),
			popularTags(db, 14),
			pastChallenges(db, 6),
			prompt ? countEntries(db, prompt.id) : null
		]);
	},
	'activity rescoring (at most every 5 min)': (db) => recomputeActivityScores(db),
	'story page': async (db) => {
		const [latest] = await db
			.select({ id: stories.id })
			.from(stories)
			.where(eq(stories.status, 'published'))
			.limit(1);
		if (!latest) return;
		await getStory(db, latest.id);
		await listComments(db, latest.id);
	},
	'stories, latest': (db) => latestFeed(db),
	'stories, popular': (db) => popularFeed(db),
	'tag page': async (db) => {
		const [tag] = await popularTags(db, 1);
		if (tag) await tagFeed(db, tag.name);
	},
	'tags directory': (db) => tagIndex(db),
	'authors directory': async (db) => {
		await listWriters(db, { pageSize: 60 });
		await countWriters(db);
		await listArchiveAuthors(db, { pageSize: 16 });
	},
	'archive author page': async (db) => {
		const [author] = await db.select({ url: archiveAuthors.url }).from(archiveAuthors).limit(1);
		if (!author) return;
		await getArchiveAuthor(db, author.url.split('/').filter(Boolean).pop()!);
		await archiveAuthorFeed(db, author.url);
	},
	'archive account profile': async (db) => {
		const archive = await db.query.users.findFirst({ where: eq(users.isArchive, true) });
		if (!archive) return;
		await authorFeed(db, archive.id);
		await countPublishedStories(db, archive.id);
	},
	'challenge page': async (db) => {
		const prompt = await todaysPrompt(db);
		if (prompt) await getChallenge(db, prompt.id);
	},
	'challenge page, most entries': async (db, pick) => {
		const [busiest] = await pick
			.select({ id: stories.challengeId, n: sql<number>`count(*)` })
			.from(stories)
			.where(sql`${stories.challengeId} is not null and ${stories.status} = 'published'`)
			.groupBy(stories.challengeId)
			.orderBy(sql`count(*) desc`)
			.limit(1);
		if (!busiest?.id) return;
		await getChallenge(db, busiest.id);
		await countEntries(db, busiest.id);
		await challengeFeed(db, busiest.id);
	},
	'challenges list': (db) => listChallenges(db),
	'chain page, biggest chain': async (db, pick) => {
		const [biggest] = await pick
			.select({ id: stories.chainId, n: sql<number>`count(*)` })
			.from(stories)
			.where(eq(stories.status, 'published'))
			.groupBy(stories.chainId)
			.orderBy(sql`count(*) desc`)
			.limit(1);
		if (!biggest?.id) return;
		await getChain(db, biggest.id);
	},
	'member profile, most stories': async (db, pick) => {
		const member = await pick.query.users.findFirst({
			where: eq(users.isArchive, false),
			orderBy: (u, { desc }) => desc(u.publishedCount)
		});
		if (!member) return;
		await authorFeed(db, member.id);
		await followCounts(db, member.id);
		await countPublishedStories(db, member.id);
		await getUserStories(db, member.id, { includeDrafts: true });
	},
	'desk, signed in': async (db, pick) => {
		const member = await pick.query.users.findFirst({
			where: eq(users.isArchive, false),
			orderBy: (u, { desc }) => desc(u.publishedCount)
		});
		if (!member) return;
		await listPublishedPosts(db);
		await recentActivity(db, member.id, 8);
		await storyCounts(db, member.id);
		await followingFeed(db, member.id, { pageSize: 5 });
		await listFollowing(db, member.id);
		await authorsToFollow(db, { viewerId: member.id, limit: 4 });
	},
	'reading list': async (db, pick) => {
		const member = await pick.query.users.findFirst({ where: eq(users.isArchive, false) });
		if (member) await bookmarksFeed(db, member.id, { viewer: { id: member.id, showMature: true } });
	},
	'blog list': (db) => listPublishedPosts(db),
	'site feed (feed.xml)': (db) => latestFeed(db),
	search: (db) => searchAll(db, 'owl')
};

/** Runs `run` with a connection that records every statement it sends, and one that doesn't. */
export async function captureStatements(
	client: Client,
	run: (db: DB, pick: DB) => Promise<unknown>
): Promise<Statement[]> {
	const statements: Statement[] = [];
	const db = drizzle(client, {
		schema,
		logger: { logQuery: (sql, params) => void statements.push({ sql, params }) }
	});
	await run(db, drizzle(client, { schema }));
	return statements;
}

/** libsql://host → https://host, the HTTP form of a Turso database URL. Null for a local file. */
export function httpUrl(databaseUrl: string): string | null {
	const m = /^(?:libsql|https?):\/\/([^/?#]+)/.exec(databaseUrl);
	return m ? `https://${m[1]}` : null;
}

type HranaValue =
	| { type: 'null' }
	| { type: 'integer'; value: string }
	| { type: 'float'; value: number }
	| { type: 'text'; value: string }
	| { type: 'blob'; base64: string };

export function toHranaValue(v: unknown): HranaValue {
	if (v === null || v === undefined) return { type: 'null' };
	if (typeof v === 'bigint') return { type: 'integer', value: v.toString() };
	if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
	if (v instanceof Date) return { type: 'integer', value: String(v.getTime()) };
	if (typeof v === 'number')
		return Number.isInteger(v)
			? { type: 'integer', value: String(v) }
			: { type: 'float', value: v };
	if (v instanceof Uint8Array) return { type: 'blob', base64: Buffer.from(v).toString('base64') };
	return { type: 'text', value: String(v as InValue) };
}

interface PipelineResult {
	type: 'ok' | 'error';
	response?: {
		result?: { rows_read?: number; rows_written?: number; query_duration_ms?: number };
	};
	error?: { message?: string };
}

/**
 * Re-runs the statements through Turso's pipeline API, one request, and reads the per-statement
 * stats it returns. The statements run a second time, so this is for diagnosis, not for pages.
 */
export async function measureStatements(
	url: string,
	authToken: string | undefined,
	statements: Statement[],
	fetchImpl: typeof fetch = fetch
): Promise<Measured[]> {
	if (statements.length === 0) return [];
	const res = await fetchImpl(`${url}/v2/pipeline`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			...(authToken ? { authorization: `Bearer ${authToken}` } : {})
		},
		body: JSON.stringify({
			requests: [
				...statements.map((s) => ({
					type: 'execute',
					stmt: { sql: s.sql, args: s.params.map(toHranaValue) }
				})),
				{ type: 'close' }
			]
		})
	});
	if (!res.ok) throw new Error(`Turso pipeline failed: ${res.status} ${await res.text()}`);
	const { results } = (await res.json()) as { results: PipelineResult[] };
	return statements.map((s, i) => {
		const r = results[i];
		if (!r || r.type !== 'ok')
			return {
				...s,
				rowsRead: null,
				rowsWritten: null,
				ms: null,
				error: r?.error?.message ?? 'no result'
			};
		const stat = r.response?.result ?? {};
		return {
			...s,
			rowsRead: stat.rows_read ?? null,
			rowsWritten: stat.rows_written ?? null,
			ms: stat.query_duration_ms ?? null
		};
	});
}

export interface ScenarioReport {
	name: string;
	rowsRead: number;
	statements: Measured[];
}

/** Every scenario, measured. Statements within a scenario come heaviest first. */
export async function diagnose(
	databaseUrl: string,
	authToken: string | undefined,
	opts: {
		fetch?: typeof fetch;
		scenarios?: typeof SCENARIOS;
		/** How to open a connection; tests point this at a local file. */
		connect?: () => Client;
	} = {}
): Promise<{ database: string; totalRowsRead: number; scenarios: ScenarioReport[] }> {
	const url = httpUrl(databaseUrl);
	if (!url) throw new Error('Diagnosis needs a remote (libsql://) database.');
	const scenarios = opts.scenarios ?? SCENARIOS;
	const connect = opts.connect ?? (() => createClient({ url: databaseUrl, authToken }));
	const reports: ScenarioReport[] = [];
	for (const [name, run] of Object.entries(scenarios)) {
		const client = connect();
		try {
			const statements = await captureStatements(client, run);
			const measured = await measureStatements(url, authToken, statements, opts.fetch);
			measured.sort((a, b) => (b.rowsRead ?? 0) - (a.rowsRead ?? 0));
			reports.push({
				name,
				rowsRead: measured.reduce((n, m) => n + (m.rowsRead ?? 0), 0),
				statements: measured
			});
		} finally {
			client.close();
		}
	}
	return {
		database: url,
		totalRowsRead: reports.reduce((n, r) => n + r.rowsRead, 0),
		scenarios: reports
	};
}
