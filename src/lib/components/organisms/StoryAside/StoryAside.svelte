<script lang="ts">
	import { formatDate, pluralize } from '#lib/format.ts';
	import type { ArchiveCreditView } from '#lib/types.ts';
	import { Icon, Link, Text } from '../../atoms/index.ts';
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

<!-- Small caps labels over the tags and the challenge; the facts between dashed rules. -->
<div class="aside">
	<section aria-labelledby="aside-tags-title">
		<h2 class="label" id="aside-tags-title">Tags</h2>
		{#if tags.length}<TagList {tags} />{:else}<Text size="sm" tone="muted">No tags yet.</Text>{/if}
	</section>

	{#if publishedAt}
		<dl class="facts" aria-label="About this story">
			<div>
				<dt class="label">Published</dt>
				<dd><strong>{formatDate(publishedAt)}</strong></dd>
			</div>
			{#if editedAt}<div>
					<dt class="label">Edited</dt>
					<dd>{formatDate(editedAt)}</dd>
				</div>{/if}
			<div>
				<dt class="label">Rated</dt>
				<dd>{ratingsCount === 0 ? 'Not yet' : pluralize(ratingsCount, 'time')}</dd>
			</div>
		</dl>
	{/if}

	{#if challenge}
		<section aria-labelledby="aside-challenges-title">
			<h2 class="label" id="aside-challenges-title">Appeared in</h2>
			<p class="challenge">
				<Icon name="fish" filled />
				<Link href="/challenges/{challenge.id}" variant="story">{challenge.title}</Link>
			</p>
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
		gap: var(--space-6);
		align-content: start;
	}

	section {
		display: grid;
		gap: var(--space-3);
	}

	.label {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.facts {
		margin: var(--space-0);
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.facts div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		padding-block: var(--space-3);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	dd {
		margin: var(--space-0);
	}

	.challenge {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-accent);
	}

	.license {
		padding-top: var(--space-4);
		border-top: var(--border-width) dashed var(--color-border-strong);
	}
</style>
