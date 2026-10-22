import { rmSync } from 'node:fs';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createDb } from '../src/lib/server/db/client.ts';

/** A fresh, migrated database for every e2e run. */
export default async function globalSetup() {
	rmSync('e2e.db', { force: true });
	await migrate(createDb('file:e2e.db'), { migrationsFolder: 'drizzle' });
}
