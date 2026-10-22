<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** accent: teal (the default) · muted: gray */
		tone?: 'accent' | 'muted';
		children: Snippet;
	}

	let { tone = 'accent', children }: Props = $props();
</script>

<p class="eyebrow {tone}">{@render children()}</p>

<style>
	.eyebrow {
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.accent {
		color: var(--color-accent);
	}

	.muted {
		color: var(--color-text-muted);
	}
</style>
