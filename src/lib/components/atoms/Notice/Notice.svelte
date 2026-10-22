<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'info' | 'success' | 'error';
		children: Snippet;
	}

	let { tone = 'info', children }: Props = $props();
</script>

<div class="notice {tone}" role={tone === 'error' ? 'alert' : 'status'}>{@render children()}</div>

<style>
	.notice {
		padding: var(--space-3) var(--space-4);
		border-left: 3px solid currentcolor;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}

	.info {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}

	.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.error {
		background: var(--color-danger-soft);
		color: var(--color-danger);
	}
</style>
