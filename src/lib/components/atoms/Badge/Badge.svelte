<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'neutral' | 'accent' | 'warning' | 'success';
		children: Snippet;
	}

	let { tone = 'neutral', children }: Props = $props();
</script>

<span class="badge {tone}">{@render children()}</span>

<style>
	.badge {
		display: inline-block;
		padding: var(--space-0) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.neutral {
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
	}

	.accent {
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.warning {
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}

	.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
</style>
