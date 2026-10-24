import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { CSP_DIRECTIVES } from './src/lib/server/security.ts';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Oregon, next to the Turso database (aws-us-west-2): every query is a round trip, and a
			// page makes several in a row, so across the country a click took seconds.
			adapter: adapter({ runtime: 'nodejs24.x', regions: ['pdx1'] }),
			// The e2e server gets its own output dir: generated files (including env values) are
			// shared and hot-reloaded, so a second dev server would otherwise rewire yours to e2e.db.
			outDir: process.env.SVELTEKIT_OUT_DIR ?? '.svelte-kit',
			// Hashes for prerendered pages, nonces for dynamic ones. The only third-party script is
			// Google Analytics; see ANALYTICS_* in security.ts.
			csp: {
				mode: 'auto',
				directives: Object.fromEntries(Object.entries(CSP_DIRECTIVES).map(([k, v]) => [k, [...v]]))
			}
		})
	],
	optimizeDeps: {
		include: ['axe-core']
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.{ts,svelte}'],
			exclude: [
				'src/lib/**/*.test.ts',
				'src/lib/**/index.ts',
				'src/lib/**/testing/**',
				'src/lib/types.ts',
				'src/lib/server/db/schema.ts'
			],
			thresholds: {
				lines: 90,
				functions: 90,
				statements: 90,
				'src/lib/**/*.ts': { lines: 90, branches: 90, functions: 90, statements: 90 },
				// Svelte compiles each interpolated attribute to `value ?? ''`; the '' side is
				// unreachable from tests, so component branch coverage is gated lower.
				'src/lib/**/*.svelte': { lines: 90, branches: 80, functions: 90, statements: 90 }
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
						// Desktop by default; mobile layouts are covered by Playwright.
						viewport: { width: 1280, height: 900 }
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['src/lib/components/testing/setup.ts']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
