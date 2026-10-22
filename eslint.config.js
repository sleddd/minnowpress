import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

// --- Project rules -----------------------------------------------------------------------------

/** AI is allowed in exactly one place: the server-side writing-prompt generator. */
const noAi = {
	regex: '^@anthropic-ai/',
	message:
		'AI may only be used in src/lib/server/prompts/ (writing prompts). Never for writing, editing, or chat.'
};

const serverOnly = [
	{
		regex: '^#lib/server/',
		message: 'Components must not import server code. Pass data in as props.'
	},
	{
		regex: '^\\$app/env/private$',
		message: 'Components must not read private environment variables.'
	}
];

/**
 * Strict atomic design: each level imports only from the levels below it, through their barrels
 * (../../atoms/index.ts etc.), never from its own level. `allowed` lists the lower levels.
 */
function level(name, allowed) {
	const lower = allowed.length ? `(?!\\.\\./(${allowed.join('|')})/index\\.ts$)` : '';
	return {
		files: [`src/lib/components/${name}/**/*.{svelte,ts}`],
		ignores: ['**/*.test.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: `^\\.\\./${lower}`,
							message: allowed.length
								? `${name} may import only from ${allowed.join(', ')}, via their index.ts barrels.`
								: 'Atoms are single elements and must not import other components.'
						},
						{
							regex: '^#lib/components/',
							message: 'Import lower levels with relative barrel paths.'
						},
						...serverOnly,
						noAi
					]
				}
			]
		}
	};
}

// -----------------------------------------------------------------------------------------------

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			'svelte/button-has-type': 'error',
			'svelte/no-at-html-tags': 'error',
			// Links are plain hrefs; we don't use resolve() for internal paths.
			'svelte/no-navigation-without-resolve': 'off',
			'no-restricted-imports': ['error', { patterns: [noAi] }]
		}
	},
	{
		files: ['src/lib/server/prompts/**'],
		rules: { 'no-restricted-imports': 'off' }
	},
	level('atoms', []),
	level('molecules', ['atoms']),
	level('organisms', ['atoms', 'molecules']),
	level('templates', ['atoms', 'molecules', 'organisms']),
	{
		// Pages compose one template filled with components. No raw HTML.
		files: ['src/routes/**/*.svelte'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: "SvelteElement[kind='html']",
					message:
						'Pages contain no HTML markup. Compose a template with components from #lib/components.'
				}
			]
		}
	}
);
