<script lang="ts">
	import type { TabView } from '#lib/types.ts';

	interface Props {
		label: string;
		tabs: TabView[];
	}

	let { label, tabs }: Props = $props();
</script>

<nav class="tabs" aria-label={label}>
	{#each tabs as tab (tab.href)}
		<a href={tab.href} aria-current={tab.current ? 'page' : undefined}>{tab.label}</a>
	{/each}
</nav>

<style>
	/* Italic tabs on a dashed rule; the current one is bold teal, underlined. */
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-7);
		margin-bottom: var(--space-6);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	a {
		padding-block: var(--space-3);
		color: var(--color-text-muted);
		font-size: var(--text-xl);
		font-style: italic;
		text-decoration: none;
	}

	a:hover {
		color: var(--color-accent);
	}

	a[aria-current='page'] {
		color: var(--color-accent);
		font-weight: var(--weight-bold);
		box-shadow: inset 0 -3px 0 var(--color-accent);
	}
</style>
