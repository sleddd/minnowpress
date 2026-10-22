<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		level?: 1 | 2 | 3 | 4;
		/** Visual size, independent of the semantic level. */
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'display';
		id?: string;
		/** accent: teal (the default) · ink: dark text */
		tone?: 'accent' | 'ink';
		children: Snippet;
	}

	const defaultSize = { 1: 'xl', 2: 'lg', 3: 'md', 4: 'sm' } as const;

	let { level = 2, size, id, tone = 'accent', children }: Props = $props();
</script>

<svelte:element this={`h${level}`} class="heading {size ?? defaultSize[level]} {tone}" {id}
	>{@render children()}</svelte:element
>

<style>
	.heading {
		font-family: var(--font-serif);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
		text-wrap: balance;
	}

	.accent {
		color: var(--color-accent);
	}

	.ink {
		color: var(--color-text);
	}

	.display {
		color: var(--color-display);
		font-size: var(--text-display);
		font-style: italic;
	}

	.xl {
		font-size: var(--text-3xl);
	}

	.lg {
		font-size: var(--text-2xl);
	}

	.md {
		font-size: var(--text-xl);
	}

	.sm {
		font-size: var(--text-lg);
	}
</style>
