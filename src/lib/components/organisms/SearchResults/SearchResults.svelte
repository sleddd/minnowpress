<script lang="ts">
	import type { AuthorEntryView, FeedItemView, TagCountView } from '#lib/types.ts';
	import { Heading, Text } from '../../atoms/index.ts';
	import { AuthorListItem, Pagination, StoryListItem, TagList } from '../../molecules/index.ts';

	interface Props {
		query: string;
		stories: { items: FeedItemView[]; page: number; hasMore: boolean };
		authors: AuthorEntryView[];
		tags: TagCountView[];
		url: { href: string };
	}

	let { query, stories, authors, tags, url }: Props = $props();

	const nothing = $derived(stories.items.length === 0 && authors.length === 0 && tags.length === 0);
</script>

<div class="results">
	<Heading level={1} size="lg">Results for “{query}”</Heading>

	{#if nothing}
		<Text tone="muted">Nothing matched. Try a shorter word, a tag, or an author's name.</Text>
	{/if}

	{#if stories.page === 1 && (authors.length || tags.length)}
		<div class="side">
			{#if authors.length}
				<section aria-labelledby="authors-results">
					<Heading level={2} size="sm" id="authors-results">Authors</Heading>
					<ul class="authors" role="list">
						{#each authors as author (author.href)}<li><AuthorListItem {author} /></li>{/each}
					</ul>
				</section>
			{/if}
			{#if tags.length}
				<section aria-labelledby="tags-results">
					<Heading level={2} size="sm" id="tags-results">Tags</Heading>
					<TagList tags={tags.map((t) => t.name)} />
				</section>
			{/if}
		</div>
	{/if}

	{#if stories.items.length}
		<section aria-labelledby="stories-results">
			<Heading level={2} size="sm" id="stories-results">Stories</Heading>
			<ol class="stories" role="list">
				{#each stories.items as story (story.id)}<li><StoryListItem {story} /></li>{/each}
			</ol>
			<Pagination page={stories.page} hasMore={stories.hasMore} {url} />
		</section>
	{/if}
</div>

<style>
	.results,
	.side,
	section {
		display: grid;
		gap: var(--space-5);
		align-content: start;
	}

	.side {
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-6);
	}

	.authors {
		display: grid;
		gap: var(--space-3);
	}

	.stories li {
		padding-block: var(--space-4);
		border-bottom: var(--border-width) dotted var(--color-rule);
	}
</style>
