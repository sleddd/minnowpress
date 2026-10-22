import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDb, type DB } from '../db/client';
import * as schema from '../db/schema';

/** A fresh in-memory database with all migrations applied. */
export async function createTestDb(): Promise<DB> {
	const db = createDb(':memory:');
	await migrate(db, { migrationsFolder: 'drizzle' });
	return db;
}

let seq = 0;

export async function makeUser(db: DB, overrides: Partial<typeof schema.users.$inferInsert> = {}) {
	seq += 1;
	const [user] = await db
		.insert(schema.users)
		.values({
			email: `user${seq}@example.com`,
			username: `user${seq}`,
			displayName: `User ${seq}`,
			...overrides
		})
		.returning();
	return user;
}

/** Appended to short test story bodies so they clear the 60-character minimum. */
export const PAD = ` ${'and the tide kept coming in, '.repeat(3).trim()}`;
