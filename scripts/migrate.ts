/**
 * Applies pending migrations to DATABASE_URL. Vercel runs this before every build (see
 * vercel.json), so a deploy can never outrun its schema. Skipped, with a note, when
 * DATABASE_URL is unset, so a local `npm run build` without a database still works.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
	console.log('DATABASE_URL is not set; skipping migrations.');
	process.exit(0);
}

const result = spawnSync('npx', ['drizzle-kit', 'migrate'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
