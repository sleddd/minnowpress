/**
 * Brings local.db up to date for `npm run dev`: applies every migration, then rebuilds the
 * summaries the nightly job keeps (tag and author counts, archive authors, archive names,
 * members' name keys). Always local.db, whatever .env says, so it can never touch production.
 *
 *   npm run db:local
 */
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { refreshAllAuthorCounts, refreshArchiveAuthors } from '../src/lib/server/authors.ts';
import { createDb } from '../src/lib/server/db/client.ts';
import { stories } from '../src/lib/server/db/schema.ts';
import { refreshAllTagCounts } from '../src/lib/server/tags.ts';
import { fillNameKeys } from '../src/lib/server/users.ts';

const db = createDb('file:local.db');

console.time('local.db');
await migrate(db, { migrationsFolder: 'drizzle' });
await refreshAllTagCounts(db);
await refreshAllAuthorCounts(db);
await refreshArchiveAuthors(db);
await fillNameKeys(db);
await db.run(sql`analyze`);
console.timeEnd('local.db');

const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(stories);
if (n === 0) console.log('No stories yet. To load the Ficly archive: npm run import:ficly:local');
