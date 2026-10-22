<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Side panel, e.g. the prompt being answered. */
		aside?: Snippet;
		children: Snippet;
	}

	let { aside, children }: Props = $props();
</script>

<div class="editor-layout" class:with-aside={Boolean(aside)}>
	<div class="main">{@render children()}</div>
	{#if aside}<aside class="aside">{@render aside()}</aside>{/if}
</div>

<style>
	.editor-layout {
		display: grid;
		gap: var(--space-6);
		max-width: calc(var(--measure) + var(--space-6));
		margin-inline: auto;
	}

	.with-aside {
		max-width: var(--page-width);
	}

	.aside {
		display: grid;
		gap: var(--space-7);
		align-content: start;
	}

	@media (min-width: 56rem) {
		.with-aside {
			grid-template-columns: minmax(0, 1fr) 18rem;
		}

		/* The sidebar sits behind a dashed rule, with room on its left. */
		.aside {
			padding-left: var(--space-6);
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}
</style>
