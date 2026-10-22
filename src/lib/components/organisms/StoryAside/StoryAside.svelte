<script lang="ts">
	import { formatDate, pluralize } from '#lib/format.ts';
	import type { ArchiveCreditView } from '#lib/types.ts';
	import { Link, Text } from '../../atoms/index.ts';
	import { ArchiveCredit, TagList } from '../../molecules/index.ts';

	interface Props {
		tags: string[];
		publishedAt: Date | null;
		editedAt?: Date | null;
		ratingsCount: number;
		challenge?: { id: number; title: string } | null;
		archive?: ArchiveCreditView | null;
	}

	let {
		tags,
		publishedAt,
		editedAt = null,
		ratingsCount,
		challenge = null,
		archive = null
	}: Props = $props();
</script>

<div class="aside">
	<section aria-labelledby="aside-tags-title">
		<Text tone="muted"><span id="aside-tags-title">This story’s tags are</span></Text>
		{#if tags.length}<TagList {tags} />{:else}<Text size="sm">No tags yet.</Text>{/if}
	</section>

	{#if publishedAt}
		<section class="facts" aria-label="About this story">
			<Text>Published on <strong>{formatDate(publishedAt)}</strong></Text>
			{#if editedAt}<Text>Edited on <strong>{formatDate(editedAt)}</strong></Text>{/if}
			<Text
				>{ratingsCount === 0 ? 'Not rated yet' : `Rated ${pluralize(ratingsCount, 'time')}`}</Text
			>
		</section>
	{/if}

	{#if challenge}
		<section aria-labelledby="aside-challenges-title">
			<Text tone="muted"
				><span id="aside-challenges-title">Challenges this story has appeared in</span></Text
			>
			<ul role="list"><li><Link href="/challenges/{challenge.id}">{challenge.title}</Link></li></ul>
		</section>
	{/if}

	<section class="license" aria-label="License">
		{#if archive}
			<ArchiveCredit credit={archive} variant="license" />
		{:else}
			<Text size="sm" tone="muted">
				This story is shared under
				<Link href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener"
					>CC BY-SA 4.0</Link
				>. Written by a person, not a machine.
			</Text>
		{/if}
	</section>
</div>

<style>
	.aside {
		display: grid;
		gap: var(--space-5);
		align-content: start;
		padding: var(--space-5);
		background: var(--color-surface-sunken);
	}

	section {
		display: grid;
		gap: var(--space-2);
	}

	.license {
		padding-top: var(--space-4);
		border-top: var(--border-width) dashed var(--color-border-strong);
	}
</style>
