<script lang="ts">
	import type { TagCountView } from '#lib/types.ts';
	import { Heading, Link, TagPill } from '../../atoms/index.ts';

	interface Props {
		title: string;
		tags: TagCountView[];
		/** Show story counts on each tag. */
		counts?: boolean;
		headingLevel?: 1 | 2;
		more?: { href: string; label: string } | null;
	}

	let { title, tags, counts = false, headingLevel = 2, more = null }: Props = $props();
	const id = $derived(`tags-${title.toLowerCase().replace(/\W+/g, '-')}`);
</script>

<section class="cloud" aria-labelledby={id}>
	<Heading level={headingLevel} size={headingLevel === 1 ? 'xl' : 'sm'} {id}>{title}</Heading>
	{#if tags.length}
		<ul class="tags" role="list">
			{#each tags as tag (tag.name)}
				<li><TagPill tag={tag.name} count={counts ? tag.count : null} /></li>
			{/each}
		</ul>
	{:else}
		<p class="none">No tags yet.</p>
	{/if}
	{#if more}<Link href={more.href}>{more.label}</Link>{/if}
</section>

<style>
	.cloud {
		display: grid;
		gap: var(--space-4);
		align-content: start;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.none {
		color: var(--color-text-muted);
	}
</style>
