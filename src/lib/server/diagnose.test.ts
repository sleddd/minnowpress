import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDb } from './db/client';
import { challenges } from './db/schema';
import { refreshArchiveAuthors } from './authors';
import { importFicly, readFiclyDump } from './archive/ficly';
import {
	captureStatements,
	diagnose,
	httpUrl,
	measureStatements,
	SCENARIOS,
	toHranaValue,
	type Statement
} from './diagnose';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

describe('httpUrl', () => {
	it('turns a Turso URL into its HTTP form and refuses local files', () => {
		expect(httpUrl('libsql://minnow-me.turso.io')).toBe('https://minnow-me.turso.io');
		expect(httpUrl('https://minnow-me.turso.io/')).toBe('https://minnow-me.turso.io');
		expect(httpUrl('file:local.db')).toBeNull();
		expect(httpUrl(':memory:')).toBeNull();
	});
});

describe('toHranaValue', () => {
	it('encodes every parameter type the driver sends', () => {
		expect(toHranaValue(null)).toEqual({ type: 'null' });
		expect(toHranaValue(undefined)).toEqual({ type: 'null' });
		expect(toHranaValue(7)).toEqual({ type: 'integer', value: '7' });
		expect(toHranaValue(2.5)).toEqual({ type: 'float', value: 2.5 });
		expect(toHranaValue(9n)).toEqual({ type: 'integer', value: '9' });
		expect(toHranaValue(true)).toEqual({ type: 'integer', value: '1' });
		expect(toHranaValue(false)).toEqual({ type: 'integer', value: '0' });
		expect(toHranaValue(new Date(1000))).toEqual({ type: 'integer', value: '1000' });
		expect(toHranaValue('owl')).toEqual({ type: 'text', value: 'owl' });
		expect(toHranaValue(new Uint8Array([1, 2]))).toEqual({ type: 'blob', base64: 'AQI=' });
	});
});

const pipeline = (results: unknown[]) =>
	vi.fn(async () => new Response(JSON.stringify({ results }), { status: 200 }));

describe('measureStatements', () => {
	const statements: Statement[] = [
		{ sql: 'select 1', params: [] },
		{ sql: 'select ?', params: [3] }
	];

	it('sends one pipeline request and reads the stats per statement', async () => {
		const fetchImpl = pipeline([
			{
				type: 'ok',
				response: { result: { rows_read: 12, rows_written: 0, query_duration_ms: 0.4 } }
			},
			{ type: 'error', error: { message: 'boom' } },
			{ type: 'ok', response: {} }
		]);
		const out = await measureStatements('https://db.test', 'tok', statements, fetchImpl);
		expect(out).toEqual([
			{ sql: 'select 1', params: [], rowsRead: 12, rowsWritten: 0, ms: 0.4 },
			{ sql: 'select ?', params: [3], rowsRead: null, rowsWritten: null, ms: null, error: 'boom' }
		]);
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://db.test/v2/pipeline');
		expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
		const body = JSON.parse(init.body as string);
		expect(body.requests).toHaveLength(3);
		expect(body.requests[1]).toEqual({
			type: 'execute',
			stmt: { sql: 'select ?', args: [{ type: 'integer', value: '3' }] }
		});
		expect(body.requests[2]).toEqual({ type: 'close' });
	});

	it('reports a missing result, skips the request for nothing, and throws on HTTP failure', async () => {
		const out = await measureStatements('https://db.test', undefined, statements, pipeline([]));
		expect(out.map((m) => m.error)).toEqual(['no result', 'no result']);
		const partial = await measureStatements(
			'https://db.test',
			undefined,
			statements,
			pipeline([{ type: 'error' }, { type: 'ok', response: { result: { rows_read: 1 } } }])
		);
		expect(partial[0].error).toBe('no result');
		expect(partial[1]).toMatchObject({ rowsRead: 1, rowsWritten: null, ms: null });
		const none = vi.fn();
		expect(await measureStatements('https://db.test', undefined, [], none)).toEqual([]);
		expect(none).not.toHaveBeenCalled();
		const failing = vi.fn(async () => new Response('nope', { status: 500 }));
		await expect(measureStatements('https://db.test', 'tok', statements, failing)).rejects.toThrow(
			/pipeline failed: 500/
		);
	});
});

describe('captureStatements and the scenarios', () => {
	let dir: string;
	let url: string;
	beforeAll(async () => {
		dir = mkdtempSync(join(tmpdir(), 'minnow-diagnose-'));
		url = `file:${join(dir, 'd.db')}`;
		const db = createDb(url);
		await migrate(db, { migrationsFolder: 'drizzle' });
		const author = await makeUser(db, { username: 'writer' });
		const [challenge] = await db
			.insert(challenges)
			.values({
				title: 'Owls',
				promptText: 'Write about an owl.',
				source: 'human',
				status: 'approved',
				startsAt: new Date(0)
			})
			.returning();
		await createStory(db, author.id, {
			title: 'Owl',
			body: 'An owl.' + PAD,
			tags: ['sea'],
			challengeId: challenge.id,
			publish: true
		});
		await importFicly(
			db,
			await readFiclyDump([
				'INSERT INTO `users` (`id`, `name`, `uri_name`)',
				'VALUES',
				"\t(1,'Kevin Lawver','kevin-lawver');",
				'INSERT INTO `stories` (`id`, `user_id`, `title`, `body`, `published_at`, `is_draft`, `is_deleted`, `is_mature`, `ratings_count`, `total_ratings_score`)',
				'VALUES',
				"\t(900001,1,'Test','Body of the test story that is long enough to publish.','2009-05-16 20:41:33',0,0,0,2,9);"
			])
		);
		await refreshArchiveAuthors(db);
	});
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it('records every statement a scenario sends', async () => {
		const client = createClient({ url });
		const statements = await captureStatements(client, SCENARIOS.home);
		client.close();
		expect(statements.length).toBeGreaterThan(3);
		expect(statements.every((s) => typeof s.sql === 'string' && Array.isArray(s.params))).toBe(
			true
		);
	});

	it('runs every scenario on a populated database and on an empty one', async () => {
		const names = Object.keys(SCENARIOS);
		const captured: string[] = [];
		for (const [name, run] of Object.entries(SCENARIOS)) {
			const client = createClient({ url });
			const statements = await captureStatements(client, run);
			client.close();
			if (statements.length) captured.push(name);
		}
		expect(captured).toEqual(names);
		const empty = await createTestDb();
		await expect(
			Promise.all(Object.values(SCENARIOS).map((run) => run(empty, empty)))
		).resolves.toHaveLength(names.length);
	});

	it('diagnose measures each scenario, heaviest statement first', async () => {
		const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
			const n = JSON.parse(init.body as string).requests.length - 1;
			const results = Array.from({ length: n }, (_, i) => ({
				type: 'ok',
				response: { result: { rows_read: i + 1, rows_written: 0, query_duration_ms: 1 } }
			}));
			return new Response(JSON.stringify({ results }), { status: 200 });
		});
		const report = await diagnose('libsql://minnow-me.turso.io', 'tok', {
			fetch: fetchImpl as unknown as typeof fetch,
			scenarios: { home: SCENARIOS.home, 'tag page': SCENARIOS['tag page'] },
			connect: () => createClient({ url })
		});
		expect(report.database).toBe('https://minnow-me.turso.io');
		expect(report.scenarios.map((s) => s.name)).toEqual(['home', 'tag page']);
		for (const s of report.scenarios) {
			expect(s.rowsRead).toBe(s.statements.reduce((n, m) => n + (m.rowsRead ?? 0), 0));
			const reads = s.statements.map((m) => m.rowsRead ?? 0);
			expect(reads).toEqual([...reads].sort((a, b) => b - a));
		}
		expect(report.totalRowsRead).toBe(report.scenarios.reduce((n, s) => n + s.rowsRead, 0));
		await expect(diagnose('file:local.db', undefined)).rejects.toThrow(/remote/);

		// Every scenario by default, tolerating a statement the server could not measure.
		const flaky = vi.fn(async (_url: string, init: RequestInit) => {
			const n = JSON.parse(init.body as string).requests.length - 1;
			const results = Array.from({ length: n }, (_, i) =>
				i === 0
					? { type: 'error', error: { message: 'skipped' } }
					: { type: 'ok', response: { result: { rows_read: 2 } } }
			);
			return new Response(JSON.stringify({ results }), { status: 200 });
		});
		const all = await diagnose('libsql://minnow-me.turso.io', undefined, {
			fetch: flaky as unknown as typeof fetch,
			connect: () => createClient({ url })
		});
		expect(all.scenarios.map((s) => s.name)).toEqual(Object.keys(SCENARIOS));
		for (const name of [
			'chain page, biggest chain',
			'challenge page, most entries',
			'desk, signed in'
		])
			expect(all.scenarios.find((s) => s.name === name)?.statements.length, name).toBeGreaterThan(
				0
			);
		expect(all.scenarios[0].statements.at(-1)?.error).toBe('skipped');

		// Without an injected connection it opens the real one, which doesn't exist here.
		await expect(
			diagnose('libsql://nowhere.invalid', 'tok', { scenarios: { home: SCENARIOS.home } })
		).rejects.toThrow();
	});
});
