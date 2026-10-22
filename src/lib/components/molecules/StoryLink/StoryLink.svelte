<script lang="ts">
	import { Badge, Link, Text } from '../../atoms/index.ts';

	interface Props {
		story: {
			id: number;
			title: string;
			relation?: 'sequel' | 'prequel' | null;
			author: { displayName: string };
			archiveAuthor?: string | null;
		};
		/** Show the sequel/prequel badge. */
		showRelation?: boolean;
	}

	let { story, showRelation = false }: Props = $props();
</script>

<span class="story-link">
	{#if showRelation && story.relation}<Badge tone="accent">{story.relation}</Badge>{/if}
	<Link href="/s/{story.id}">{story.title}</Link>
	<Text as="span" tone="muted" size="sm">by {story.archiveAuthor ?? story.author.displayName}</Text>
</span>

<style>
	.story-link {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
