<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** SettingsSections, each ruled off from the one before. */
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="settings-layout">
	<h1 class="title">{title}</h1>
	{@render children()}
</div>

<style>
	.settings-layout {
		display: grid;
		padding-block: var(--space-6) var(--space-5);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.title {
		margin-bottom: var(--space-6);
		color: var(--color-accent);
		font-size: var(--text-display);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}
</style>
