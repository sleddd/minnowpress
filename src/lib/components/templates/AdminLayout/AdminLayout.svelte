<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** The page title, shown the same way on every admin screen. */
		title?: string;
		/** A sentence under the title saying what the screen is for. */
		description?: string;
		/** A button beside the title, e.g. "New post". */
		action?: Snippet;
		/** Section navigation; omit when a parent layout already renders it. */
		nav?: Snippet;
		/** Secondary panel, e.g. the prompt composer. */
		aside?: Snippet;
		children: Snippet;
	}

	let { title, description, action, nav, aside, children }: Props = $props();
</script>

<div class="admin">
	{#if nav}{@render nav()}{/if}
	{#if title}
		<header class="header">
			<div class="text">
				<h1>{title}</h1>
				{#if description}<p>{description}</p>{/if}
			</div>
			{#if action}<div class="action">{@render action()}</div>{/if}
		</header>
	{/if}
	<div class="body" class:with-aside={Boolean(aside)}>
		<div class="main">{@render children()}</div>
		{#if aside}<aside class="aside">{@render aside()}</aside>{/if}
	</div>
</div>

<style>
	.admin {
		display: grid;
		gap: var(--space-7);
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4) var(--space-6);
	}

	.text {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		color: var(--color-text-muted);
	}

	h1 {
		color: var(--color-accent);
		font-size: var(--text-story-title);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	.body {
		display: grid;
		gap: var(--space-7);
	}

	.main {
		display: grid;
		gap: var(--space-7);
		align-content: start;
		min-width: 0;
	}

	@media (min-width: 56rem) {
		.with-aside {
			grid-template-columns: minmax(0, 1fr) 20rem;
		}
	}
</style>
