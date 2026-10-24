<script lang="ts">
	import { archiveAuthorPath } from '#lib/archive.ts';
	import { excerpt, formatDate } from '#lib/format.ts';
	import { typeset } from '#lib/typeset.ts';
	import type { ArchiveCreditView, AuthorView, Relation } from '#lib/types.ts';
	import { Badge, Link, RatingFish, Timestamp } from '../../atoms/index.ts';

	interface Props {
		story: {
			id: number;
			title: string;
			body?: string;
			relation?: Relation | null;
			isMature?: boolean;
			ratingsCount?: number;
			averageRating?: number | null;
			publishedAt?: Date | null;
			author: Pick<AuthorView, 'username' | 'displayName'>;
			archive?: ArchiveCreditView | null;
			archiveAuthor?: string | null;
		};
		/** feed: excerpt, date, and rating · compact: title and author only */
		variant?: 'feed' | 'compact';
		/** Right-align (the Sequels column). */
		align?: 'start' | 'end';
		/** label: "Author: name" · by: "by name" (the home page lanes) */
		byline?: 'label' | 'by';
		/** Off on a writer's own profile, where every story is theirs. */
		showAuthor?: boolean;
	}

	let {
		story,
		variant = 'feed',
		align = 'start',
		byline = 'label',
		showAuthor = true
	}: Props = $props();

	const authorName = $derived(
		story.archive?.author ?? story.archiveAuthor ?? story.author.displayName
	);
	const authorHref = $derived(
		story.archive
			? archiveAuthorPath(story.archive.authorUrl)
			: story.archiveAuthor
				? null
				: `/@${story.author.username}`
	);
</script>

<article class="item {variant} {align}" aria-labelledby="story-{story.id}-title">
	<h3 class="title" id="story-{story.id}-title">
		<Link href="/s/{story.id}" variant="story">{story.title}</Link>
	</h3>
	{#if showAuthor}<p class="author {byline}">
			{#if byline === 'by'}by{:else}<span class="label">Author:</span>{/if}
			{#if authorHref}<Link href={authorHref} variant="subtle">{authorName}</Link
				>{:else}{authorName}{/if}
		</p>{/if}
	{#if variant === 'feed'}
		{#if story.body}<p class="excerpt">
				{#each typeset(excerpt(story.body, 160)) as part, i (i)}{#if part.em}<em>{part.text}</em
						>{:else}{part.text}{/if}{/each}
			</p>{/if}
		<p class="meta">
			{#if story.publishedAt}
				{#if story.archive}<span>{formatDate(story.publishedAt)}</span>{:else}<Timestamp
						date={story.publishedAt}
					/>{/if}
			{/if}
			{#if story.relation}<span class="relation">{story.relation}</span>{/if}
			{#if story.archive && showAuthor}<span>· Ficly archive</span>{/if}
			{#if story.ratingsCount}
				<span class="rating"
					><RatingFish value={story.averageRating ?? null} size="sm" /> ({story.ratingsCount})</span
				>
			{/if}
			{#if story.isMature}<Badge tone="warning">Mature</Badge>{/if}
		</p>
	{/if}
</article>

<style>
	.item {
		display: grid;
		gap: var(--space-1);
	}

	.end {
		justify-items: end;
		text-align: right;
	}

	.title {
		font-size: inherit;
		font-weight: var(--weight-normal);
		line-height: var(--leading-tight);
	}

	.feed .title :global(a) {
		font-size: var(--text-xl);
	}

	.author {
		font-size: var(--text-sm);
	}

	/* Let long names wrap after "by" / "Author:" instead of dropping to their own line. */
	.author :global(a) {
		display: inline;
	}

	.label {
		color: var(--color-accent);
	}

	.by {
		color: var(--color-text-muted);
	}

	.by :global(a) {
		color: inherit;
	}

	.excerpt {
		max-width: var(--measure);
		font-size: var(--text-md);
		line-height: var(--leading-prose);
	}

	/* Prequel / sequel, as a small luggage tag like the tag pills. */
	.relation {
		--point: 0.6em;
		--pad-start: calc(var(--point) + var(--space-3));

		padding: var(--space-0) var(--space-3) var(--space-0) var(--pad-start);
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-style: italic;
		clip-path: polygon(var(--point) 0, 100% 0, 100% 100%, var(--point) 100%, 0 50%);
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.meta :global(time) {
		font-size: inherit;
	}

	.rating {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}
</style>
