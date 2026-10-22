import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { normalizeQuery, searchAll } from './search';
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
