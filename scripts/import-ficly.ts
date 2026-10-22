/**
 * Imports the Ficly archive dump into the database at DATABASE_URL.
 *
 *   curl -LO https://raw.githubusercontent.com/ficly/ficly_export/master/db/ficly_export.sql.gz
 *   npm run import:ficly -- ficly_export.sql.gz
 *
 * Safe to re-run: rows are keyed by their Ficly id.
 */
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { importFicly, readFiclyDump } from '../src/lib/server/archive/ficly.ts';
import { splitLines } from '../src/lib/server/archive/sqldump.ts';
import { createDb } from '../src/lib/server/db/client.ts';

const [path] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!path || !url) {
	console.error('Usage: DATABASE_URL=… npm run import:ficly -- <ficly_export.sql[.gz]>');
	process.exit(1);
}

const file = createReadStream(path);
const input = path.endsWith('.gz') ? file.pipe(createGunzip()) : file;

console.time('import');
const dump = await readFiclyDump(splitLines(input));
console.log(`Read ${dump.stories.length} stories and ${dump.challenges.length} challenges.`);
const result = await importFicly(
	createDb(url, process.env.DATABASE_AUTH_TOKEN || undefined),
	dump,
	{
		log: (msg) => console.log(`  ${msg}`)
	}
);
console.log(
	`Imported ${result.stories} new stories, ${result.challenges} new challenges; ${result.linked} continuations linked.`
);
console.timeEnd('import');
