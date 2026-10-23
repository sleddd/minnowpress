<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Greeting, title, and the write button. */
		header: Snippet;
		/** Left half of the top band: the member's latest stories. */
		stories: Snippet;
		/** Right half of the top band, e.g. recent activity. */
		activity: Snippet;
		/** The sidebar: desk links, library, people you follow. */
		aside: Snippet;
		children: Snippet;
	}

	let { header, stories, activity, aside, children }: Props = $props();
</script>

<div class="desk-layout">
	<div class="main">
		<div class="header">{@render header()}</div>
		<div class="band">
			<div class="half stories">{@render stories()}</div>
			<div class="half activity">{@render activity()}</div>
		</div>
		{@render children()}
	</div>
	<aside class="aside">{@render aside()}</aside>
</div>

<style>
	.desk-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
	}

	.main,
	.aside {
		display: grid;
		gap: var(--space-7);
		align-content: start;
	}

	/* Your stories and activity side by side, between dashed rules. */
	.band {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		border-block: var(--border-width) dashed var(--color-border-strong);
	}

	.half {
		padding-block: var(--space-5);
	}

	.activity {
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	@media (min-width: 40rem) {
		.band {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}

		.stories {
			padding-right: var(--space-6);
		}

		.activity {
			padding-left: var(--space-6);
			border-top: 0;
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}

	@media (min-width: 52rem) {
		.desk-layout {
			grid-template-columns: minmax(0, 1fr) var(--sidebar-width);
		}

		.aside {
			padding-left: var(--space-6);
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}
</style>
