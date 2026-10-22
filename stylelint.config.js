/**
 * Components style with design tokens only (src/lib/styles/tokens.css): colors, spacing,
 * font sizes, families and radii must be var(--…). tokens.css is the one place raw values live.
 */
export default {
	extends: ['stylelint-config-standard'],
	plugins: ['stylelint-declaration-strict-value'],
	ignoreFiles: ['src/lib/styles/tokens.css', 'build/**', '.svelte-kit/**', '.vercel/**'],
	overrides: [{ files: ['**/*.svelte'], customSyntax: 'postcss-html' }],
	rules: {
		'scale-unlimited/declaration-strict-value': [
			[
				'/color$/',
				'background',
				'fill',
				'stroke',
				'font-size',
				'font-family',
				'font-weight',
				'line-height',
				'border-radius',
				'/^(margin|padding)/',
				'gap',
				'row-gap',
				'column-gap'
			],
			{
				ignoreFunctions: false,
				ignoreValues: [
					'inherit',
					'transparent',
					'currentcolor',
					'currentColor',
					'none',
					'0',
					'auto',
					'initial',
					'unset'
				],
				message: 'Use a design token (var(--…)) from src/lib/styles/tokens.css for "${property}".'
			}
		],
		'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
		// Svelte scoped class names follow component naming, and some props are intentionally long-form.
		'declaration-block-no-redundant-longhand-properties': null,
		'media-feature-range-notation': null
	}
};
