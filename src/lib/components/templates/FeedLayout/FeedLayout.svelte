<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Page heading or profile header. */
		intro?: Snippet;
		/** Feature above the feed, e.g. Today's Prompt. */
		feature?: Snippet;
		tabs?: Snippet;
		children: Snippet;
	}

	let { intro, feature, tabs, children }: Props = $props();
</script>

<div class="feed-layout">
	{#if intro}<div class="intro">{@render intro()}</div>{/if}
	{#if feature}<div class="feature">{@render feature()}</div>{/if}
	{#if tabs}{@render tabs()}{/if}
	<div class="content">{@render children()}</div>
</div>

<style>
	.feed-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-5);
		max-width: var(--page-width);
		margin-inline: auto;
	}

	/* Room above and below, e.g. the tag row on Browse. */
	.feature {
		padding-block: var(--space-4) var(--space-6);
	}

	.intro {
		display: grid;
		gap: var(--space-2);
	}
</style>
