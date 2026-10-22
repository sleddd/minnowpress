<script lang="ts">
	import type { FeedItemView } from '#lib/types.ts';
	import { Heading, Link } from '../../atoms/index.ts';
	import { EmptyState, Pagination, StoryListItem } from '../../molecules/index.ts';

	interface Props {
		label: string;
		/** Anchor id, e.g. "drafts". */
		id?: string;
		/** Visible section heading, e.g. "New stories". */
		title?: string;
		/** Small italic aside next to the heading, e.g. "by theminnow". */
		note?: string;
		/** Hide author names when every story is by the same writer. */
		showAuthor?: boolean;
		/** Show the empty message as one quiet line between dashed rules, not a box. */
		quietEmpty?: boolean;
		/** "See all" link next to the heading. */
		more?: { href: string; label: string } | null;
		items: FeedItemView[];
		page?: number;
		hasMore?: boolean;
		url?: { href: string } | null;
		empty: { title: string; message?: string; action?: { href: string; label: string } };
	}

	let {
		label,
		id,
		title,
		note,
		showAuthor = true,
		quietEmpty = false,
		more = null,
		items,
		page = 1,
		hasMore = false,
		url = null,
		empty
	}: Props = $props();

	// Unique per list, so a page can show more than one (drafts and stories on a profile).
	const headingId = $derived(`feed-${(id ?? label).toLowerCase().replace(/\W+/g, '-')}`);
</script>

<section
	{id}
	class="feed"
	aria-label={title ? undefined : label}
	aria-labelledby={title ? headingId : undefined}
>
	{#if title}
		<div class="head">
			<div class="title">
				<Heading level={2} size="lg" id={headingId}>{title}</Heading>
				{#if note}<span class="note">{note}</span>{/if}
			</div>
			{#if more}<Link href={more.href}>{more.label}</Link>{/if}
		</div>
	{/if}
	{#if items.length === 0}
		{#if quietEmpty}
			<p class="quiet"><strong>{empty.title}</strong> {empty.message ?? ''}</p>
		{:else}
			<EmptyState title={empty.title} message={empty.message} action={empty.action} />
		{/if}
	{:else}
		<ol class="list" role="list">
			{#each items as story (story.id)}
				<li><StoryListItem {story} {showAuthor} /></li>
			{/each}
		</ol>
		{#if url}<Pagination {page} {hasMore} {url} />{/if}
	{/if}
</section>

<style>
	.feed {
		display: grid;
		gap: var(--space-4);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-3);
	}

	.note {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-style: italic;
	}

	.quiet {
		padding-block: var(--space-5);
		border-block: var(--border-width) dashed var(--color-border-strong);
		font-size: var(--text-lg);
	}

	.quiet strong {
		color: var(--color-accent);
	}

	.list li {
		padding-block: var(--space-5);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.list li:first-child {
		padding-top: var(--space-2);
	}
</style>
