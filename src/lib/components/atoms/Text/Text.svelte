<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		as?: 'p' | 'span';
		tone?: 'default' | 'muted';
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { as = 'p', tone = 'default', size = 'md', children }: Props = $props();
</script>

<svelte:element this={as} class="text {tone} {size}">{@render children()}</svelte:element>

<style>
	.default {
		color: var(--color-text);
	}

	.muted {
		color: var(--color-text-muted);
	}

	.sm {
		font-size: var(--text-sm);
	}

	.md {
		font-size: var(--text-md);
	}

	.lg {
		font-size: var(--text-lg);
	}
</style>
