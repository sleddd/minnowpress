<script lang="ts">
	import { formatDate } from '#lib/format.ts';
	import type { OwnStoryView } from '#lib/types.ts';
	import { Badge, Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		username: string;
		/** The member's latest stories, drafts and published together. */
		stories: OwnStoryView[];
	}

	let { username, stories }: Props = $props();
</script>

<section class="desk-stories" aria-labelledby="desk-stories-title">
	<Heading level={2} size="md" id="desk-stories-title">Your latest stories</Heading>
	{#if stories.length}
		<ul class="list" role="list">
			{#each stories as story (story.id)}
				<li class="item">
					<Link href="/s/{story.id}" variant="story">{story.title}</Link>
					<Text as="span" size="sm" tone="muted"
						>{#if story.draft}<Badge>Draft</Badge> started {formatDate(story.at)}{:else}Published
							{formatDate(story.at)}{/if}</Text
					>
				</li>
			{/each}
		</ul>
		<Link href="/@{username}">All your stories</Link>
	{:else}
		<Text tone="muted">Nothing yet. <Link href="/write">Write your first story.</Link></Text>
	{/if}
</section>

<style>
	.desk-stories {
		display: grid;
		gap: var(--space-3);
		justify-items: start;
	}

	.list {
		display: grid;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.item {
		display: grid;
		gap: var(--space-1);
	}
</style>
