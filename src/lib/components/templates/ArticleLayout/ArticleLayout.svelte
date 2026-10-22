<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The sidebar beside the article. */
		aside?: Snippet;
		/** Full-width sections below, e.g. continuations and comments. */
		below?: Snippet;
		/** A dashed rule between the main column and the sidebar. */
		divided?: boolean;
		children: Snippet;
	}

	let { aside, below, divided = false, children }: Props = $props();
</script>

<div class="article-layout">
	<div class="top" class:with-aside={Boolean(aside)} class:divided>
		<div class="main">{@render children()}</div>
		{#if aside}<aside class="aside">{@render aside()}</aside>{/if}
	</div>
	{#if below}<div class="below">{@render below()}</div>{/if}
</div>

<style>
	.article-layout,
	.below {
		display: grid;
		gap: var(--space-8);
	}

	.aside {
		display: grid;
		gap: var(--space-6);
		align-content: start;
	}

	.main {
		display: grid;
		gap: var(--space-7);
		align-content: start;
	}

	.top {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
		align-items: start;
	}

	@media (min-width: 52rem) {
		.with-aside {
			grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
			gap: var(--space-8);
		}

		.divided .aside {
			padding-left: var(--space-7);
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}
</style>
