<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	interface Props extends HTMLAnchorAttributes {
		href: string;
		/**
		 * default: teal text · subtle: inherits color · title: story/heading link ·
		 * nav: tab-style · navbar: item in the solid teal bar ·
		 * button / outline / cta: link styled as a button
		 */
		variant?:
			| 'default'
			| 'subtle'
			| 'title'
			| 'story'
			| 'nav'
			| 'navbar'
			| 'button'
			| 'outline'
			| 'cta'
			| 'ribbon';
		current?: boolean;
		/** Stretch to the container's width (button styles). */
		block?: boolean;
		children: Snippet;
	}

	let {
		href,
		variant = 'default',
		current = false,
		block = false,
		children,
		...rest
	}: Props = $props();
</script>

<a class="link {variant}" class:block {href} aria-current={current ? 'page' : undefined} {...rest}
	>{@render children()}</a
>

<style>
	.link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		border-radius: var(--radius-sm);
		color: var(--color-accent);
		text-decoration: none;
	}

	.title {
		font-weight: var(--weight-bold);
	}

	.story {
		font-style: italic;
		font-size: var(--text-lg);
	}

	.story:hover {
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

	.default:hover,
	.title:hover {
		color: var(--color-accent-hover);
		text-decoration: underline;
		text-underline-offset: 0.18em;
		text-decoration-thickness: 1px;
	}

	.subtle {
		color: inherit;
	}

	.subtle:hover {
		color: var(--color-accent);
	}

	.nav {
		padding: var(--space-1) var(--space-2);
		color: var(--color-text-muted);
	}

	.nav:hover,
	.nav[aria-current='page'] {
		color: var(--color-text);
	}

	.nav[aria-current='page'] {
		box-shadow: inset 0 -2px 0 var(--color-accent);
	}

	.navbar {
		justify-content: center;
		padding: var(--space-4) var(--space-5);
		border-radius: var(--space-0);
		color: var(--color-nav-text);
		font-size: var(--text-lg);
		white-space: nowrap;
	}

	.navbar:hover {
		background: var(--color-accent-hover);
	}

	.navbar[aria-current='page'] {
		background: var(--color-nav-current);
	}

	.button,
	.outline,
	.cta {
		justify-content: center;
		padding: var(--space-3) var(--space-5);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		line-height: var(--leading-tight);
	}

	.button {
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-weight: var(--weight-semibold);
	}

	.button:hover {
		background: var(--color-accent-hover);
	}

	.outline {
		background: var(--color-surface);
		border-color: var(--color-accent);
	}

	.outline:hover {
		background: var(--color-accent-soft);
	}

	.cta {
		background: var(--color-cta);
		color: var(--color-accent-contrast);
		font-weight: var(--weight-semibold);
	}

	.cta:hover {
		background: var(--color-cta-hover);
	}

	.block {
		display: flex;
		width: 100%;
	}

	/* A teal ribbon with a notched tail, like the nav and the editor's publish button. */
	.ribbon {
		--notch: var(--space-4);
		--pad-end: calc(var(--notch) + var(--space-5));

		padding: var(--space-3) var(--pad-end) var(--space-3) var(--space-6);
		border-radius: var(--space-0);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-size: var(--text-xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		text-decoration: none;
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.ribbon:hover {
		background: var(--color-accent-hover);
		color: var(--color-accent-contrast);
	}
</style>
