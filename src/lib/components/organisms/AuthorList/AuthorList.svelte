<script lang="ts">
	import type { AuthorEntryView } from '#lib/types.ts';
	import { Heading, Link, Text } from '../../atoms/index.ts';
	import { AuthorListItem } from '../../molecules/index.ts';

	interface Props {
		title: string;
		authors: AuthorEntryView[];
		headingLevel?: 2 | 3;
		/** grid: multi-column directory · list: single column (sidebar) */
		layout?: 'list' | 'grid';
		empty?: string;
		more?: { href: string; label: string } | null;
	}

	let {
		title,
		authors,
		headingLevel = 2,
		layout = 'list',
		empty = 'No writers yet.',
		more = null
	}: Props = $props();
	const id = $derived(`authors-${title.toLowerCase().replace(/\W+/g, '-')}`);
</script>

<section class="authors" aria-labelledby={id}>
	<Heading level={headingLevel} size="sm" {id}>{title}</Heading>
	{#if authors.length}
		<ul class="list {layout}" role="list">
			{#each authors as author (author.href)}
				<li><AuthorListItem {author} /></li>
			{/each}
		</ul>
	{:else}
		<Text tone="muted">{empty}</Text>
	{/if}
	{#if more}<Link href={more.href}>{more.label}</Link>{/if}
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

	.grid {
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: var(--space-5);
	}
</style>
