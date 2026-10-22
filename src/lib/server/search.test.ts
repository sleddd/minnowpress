import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { allowSearch, normalizeQuery, SEARCH_LIMITS, searchAll } from './search';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

describe('normalizeQuery', () => {
	it('trims, collapses spaces, and enforces length bounds', () => {
		expect(normalizeQuery('  duck   suit ')).toBe('duck suit');
		expect(normalizeQuery('a')).toBeNull();
		expect(normalizeQuery(null)).toBeNull();
		expect(normalizeQuery('x'.repeat(500))).toHaveLength(100);
	});
});

describe('searchAll', () => {
	let db: DB;
	beforeEach(async () => {
		db = await createTestDb();
	});

	it('finds stories, authors, and tags', async () => {
		const duck = await makeUser(db, { displayName: 'Duck Fan', username: 'duckfan' });
		await createStory(db, duck.id, {
			title: 'Duck Suit',
			body: 'Quack.' + PAD,
			tags: ['ducks'],
			publish: true
		});
		await createStory(db, duck.id, {
			title: 'Other',
			body: 'No birds.' + PAD,
			tags: [],
			publish: true
		});
		const result = await searchAll(db, 'duck');
		expect(result.query).toBe('duck');
		expect(result.stories.items.map((s) => s.title)).toEqual(['Duck Suit']);
		expect(result.authors.map((a) => a.name)).toEqual(['Duck Fan']);
		expect(result.tags).toEqual([{ name: 'ducks', count: 1 }]);
	});
});

describe('allowSearch', () => {
	const NOW = new Date('2026-10-22T12:00:00Z');

	it('caps searches per network address per window, counting refused ones', async () => {
		const db = await createTestDb();
		for (let i = 0; i < SEARCH_LIMITS.perAddress; i++)
			expect(await allowSearch(db, '203.0.113.9', NOW)).toBe(true);
		expect(await allowSearch(db, '203.0.113.9', NOW)).toBe(false);
		expect(await allowSearch(db, '203.0.113.9', NOW)).toBe(false);
		// Someone else is unaffected.
		expect(await allowSearch(db, '198.51.100.7', NOW)).toBe(true);
		// The window passes and old rows are pruned.
		const later = new Date(NOW.getTime() + (SEARCH_LIMITS.windowMinutes + 1) * 60_000);
		expect(await allowSearch(db, '203.0.113.9', later)).toBe(true);
	});

	it('cannot be slipped under by a burst of parallel searches', async () => {
		const db = await createTestDb();
		const results = await Promise.all(
			Array.from({ length: SEARCH_LIMITS.perAddress + 10 }, () =>
				allowSearch(db, '203.0.113.9', NOW)
			)
		);
		// Every search counts the others, so at most the limit get through, possibly none.
		expect(results.filter(Boolean).length).toBeLessThanOrEqual(SEARCH_LIMITS.perAddress);
	});
});
