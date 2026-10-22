import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from './client';

describe('createDb', () => {
	it('connects to a libSQL database', async () => {
		const db = createDb(':memory:');
		const rows = await db.all<{ one: number }>(sql`select 1 as one`);
		expect(rows).toEqual([{ one: 1 }]);
	});
});
