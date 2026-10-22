<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		hero: Snippet;
		/** Beside the hero, e.g. this week's challenge. */
		feature?: Snippet;
		/** Beside the main column, e.g. popular tags and authors. */
		sidebar?: Snippet;
		children: Snippet;
	}

	let { hero, feature, sidebar, children }: Props = $props();
</script>

<div class="home">
	<div class="top" class:with-feature={Boolean(feature)}>
		{@render hero()}
		{#if feature}<div class="feature">{@render feature()}</div>{/if}
	</div>
	<div class="bottom" class:with-sidebar={Boolean(sidebar)}>
		<div class="main">{@render children()}</div>
		{#if sidebar}<aside class="sidebar">{@render sidebar()}</aside>{/if}
	</div>
</div>

<style>
	.home {
		display: grid;
		gap: var(--space-8);
	}

	.top,
	.bottom {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
		align-items: start;
	}

	/* The current challenge sits close under the welcome, with room before the lanes. */
	.main {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-9);
	}

	.sidebar {
		display: grid;
		gap: var(--space-7);
	}

	@media (min-width: 52rem) {
		.with-feature {
			grid-template-columns: minmax(0, 1fr) minmax(16rem, 26rem);
		}

		.with-sidebar {
			grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		}
	}
</style>
