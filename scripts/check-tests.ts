/**
 * Fails when a component or module under src/lib has no sibling test file.
 *   Foo.svelte → Foo.svelte.test.ts   (browser component test)
 *   foo.ts     → foo.test.ts          (unit test)
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src/lib';

/** Files that hold no logic of their own. */
const EXEMPT = [
	/\/index\.ts$/, // barrels and env-wired singletons
	/\.test\.ts$/,
	/\/testing\//,
	/^src\/lib\/types\.ts$/, // type declarations only
	/^src\/lib\/server\/db\/schema\.ts$/ // table declarations, exercised by every server test
];

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? walk(path) : [path];
	});
}

export function missingTests(
	files: string[],
	exists: (path: string) => boolean = existsSync
): string[] {
	return files
		.filter((f) => /\.(svelte|ts)$/.test(f) && !EXEMPT.some((re) => re.test(f)))
		.filter(
			(f) => !exists(f.endsWith('.svelte') ? `${f}.test.ts` : f.replace(/\.ts$/, '.test.ts'))
		);
}

if (import.meta.main) {
	const missing = missingTests(walk(ROOT).map((f) => relative('.', f)));
	if (missing.length) {
		console.error(
			`Missing tests for ${missing.length} file(s):\n${missing.map((f) => `  - ${f}`).join('\n')}`
		);
		process.exit(1);
	}
	console.log('Every component and module has a test.');
}
