<script lang="ts">
	interface Props {
		id?: string;
		count: number;
		max: number;
	}

	let { id, count, max }: Props = $props();

	const remaining = $derived(max - count);
	const state = $derived(remaining < 0 ? 'over' : remaining <= max * 0.1 ? 'near' : 'ok');
</script>

<output class="count {state}" {id} aria-live="polite">
	{count} / {max}
	{#if remaining < 0}<span class="note">({-remaining} over)</span>{/if}
</output>

<style>
	.count {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}

	.near {
		color: var(--color-warning);
	}

	.over {
		color: var(--color-danger);
		font-weight: var(--weight-bold);
	}
</style>
