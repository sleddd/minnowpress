<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The profile card, on the left. */
		sidebar: Snippet;
		children: Snippet;
	}

	let { sidebar, children }: Props = $props();
</script>

<div class="profile-layout">
	<aside class="sidebar">{@render sidebar()}</aside>
	<div class="main">{@render children()}</div>
</div>

<style>
	.profile-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
	}

	.main {
		display: grid;
		gap: var(--space-7);
		align-content: start;
	}

	@media (min-width: 52rem) {
		.profile-layout {
			grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
			gap: var(--space-0);
		}

		.sidebar {
			padding-right: var(--space-7);
			border-right: var(--border-width) dashed var(--color-border-strong);
		}

		.main {
			padding-left: var(--space-7);
		}
	}
</style>
