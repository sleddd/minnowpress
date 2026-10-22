<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Comments or related content below the reading column. */
		after?: Snippet;
		children: Snippet;
	}

	let { after, children }: Props = $props();
</script>

<div class="reading">
	{@render children()}
	{#if after}<div class="after">{@render after()}</div>{/if}
</div>

<style>
	.reading {
		display: grid;
		gap: var(--space-7);
		max-width: calc(var(--measure) + var(--space-6));
		margin-inline: auto;
	}

	.after {
		padding-top: var(--space-5);
		border-top: var(--border-width) solid var(--color-border);
	}
</style>
