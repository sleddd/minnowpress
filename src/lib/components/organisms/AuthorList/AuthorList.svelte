<script lang="ts">
	import type { AuthorEntryView } from '#lib/types.ts';
	import { Heading, Link, Text } from '../../atoms/index.ts';
	import { AuthorListItem } from '../../molecules/index.ts';

	interface Props {
		title: string;
		authors: AuthorEntryView[];
		headingLevel?: 2 | 3;
		/**
		 * grid: the directory, four across under a ruled heading, with compact entries
		 * · list: single column (sidebar)
		 */
		layout?: 'list' | 'grid';
		/** A short italic aside beside the heading, e.g. "1 writer". */
		note?: string | null;
		empty?: string;
		/** keepScroll: the link grows the list in place, so the page stays where it is. */
		more?: { href: string; label: string; keepScroll?: boolean } | null;
	}

	let {
		title,
		authors,
		headingLevel = 2,
		layout = 'list',
		note = null,
		empty = 'No writers yet.',
		more = null
	}: Props = $props();
	const id = $derived(`authors-${title.toLowerCase().replace(/\W+/g, '-')}`);
</script>

<section class="authors" aria-labelledby={id}>
	<div class="head">
		<Heading level={headingLevel} size={layout === 'grid' ? 'md' : 'sm'} {id}>{title}</Heading>
		{#if note}<span class="note">{note}</span>{/if}
	</div>
	{#if authors.length}
		<ul class="list {layout}" role="list">
			{#each authors as author (author.href)}
				<li><AuthorListItem {author} compact={layout === 'grid'} /></li>
			{/each}
		</ul>
	{:else}
		<Text tone="muted">{empty}</Text>
	{/if}
	{#if more}<div class="more">
			<Link href={more.href} data-sveltekit-reset={more.keepScroll ? false : undefined}
				>{more.label}</Link
			>
		</div>{/if}
</section>

<style>
	.authors {
		display: grid;
		gap: var(--space-4);
		align-content: start;
	}

	.list {
		display: grid;
		gap: var(--space-4);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
	}

	.note {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-style: italic;
	}

	/* The directory: a dashed rule under the heading, then four across on a wide screen. */
	.authors:has(.grid) {
		gap: var(--space-5);
	}

	.authors:has(.grid):not(:last-child) {
		margin-bottom: var(--space-6);
	}

	.authors:has(.grid) .head {
		padding-bottom: var(--space-3);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.grid ~ .more :global(a) {
		font-style: italic;
	}

	.grid {
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: var(--space-5) var(--space-4);
	}
</style>
