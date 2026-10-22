<script lang="ts">
	import type { ChainNode } from '#lib/chain.ts';
	import type { StorySummary } from '#lib/types.ts';
	import { Badge } from '../../atoms/index.ts';
	import { StoryLink } from '../../molecules/index.ts';

	interface Props {
		nodes: ChainNode<StorySummary>[];
		/** Highlights this story in the tree. */
		currentId?: number | null;
	}

	let { nodes, currentId = null }: Props = $props();
</script>

{#snippet branch(list: ChainNode<StorySummary>[])}
	<ul class="branch" role="list">
		{#each list as node (node.story.id)}
			<li class="node" class:current={node.story.id === currentId}>
				<StoryLink story={node.story} showRelation />
				{#if node.story.id === currentId}<Badge>You are here</Badge>{/if}
				{#if node.prequels.length || node.sequels.length}
					{@render branch([...node.prequels, ...node.sequels])}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<nav class="tree" aria-label="Story chain">
	{@render branch(nodes)}
</nav>

<style>
	.branch {
		display: grid;
		gap: var(--space-2);
	}

	.branch .branch {
		margin-top: var(--space-2);
		padding-left: var(--space-5);
		border-left: 2px solid var(--color-border);
	}

	.node {
		font-family: var(--font-serif);
	}

	.current > :global(.story-link) {
		font-weight: var(--weight-bold);
	}
</style>
