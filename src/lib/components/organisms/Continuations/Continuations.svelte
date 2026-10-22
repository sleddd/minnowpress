<script lang="ts">
	import type { StorySummary } from '#lib/types.ts';
	import { pluralize } from '#lib/format.ts';
	import { Link, Text } from '../../atoms/index.ts';
	import { StoryListItem } from '../../molecules/index.ts';

	interface Props {
		storyId: number;
		prequels: StorySummary[];
		sequels: StorySummary[];
		/** Links to the full chain when this story is part of one. */
		chainHref?: string | null;
	}

	let { storyId, prequels, sequels, chainHref = null }: Props = $props();
</script>

{#snippet column(kind: 'prequel' | 'sequel', items: StorySummary[])}
	<section class="column {kind}" aria-labelledby="{kind}s-title">
		<h2 id="{kind}s-title">
			{#if kind === 'prequel'}<span aria-hidden="true">←</span> Prequels{:else}Sequels
				<span aria-hidden="true">→</span>{/if}
		</h2>
		{#if items.length}
			<!-- Just the next one; the rest are a click away in the whole chain. -->
			<StoryListItem story={items[0]} variant="compact" />
			{#if items.length > 1}
				<p class="more">
					+ {pluralize(items.length - 1, `more ${kind}`, `more ${kind}s`)}
					{#if chainHref}— <Link href={chainHref}>see the whole chain</Link>{/if}
				</p>
			{/if}
		{:else}
			<Text
				><strong>Oh no!</strong> This story doesn’t have a {kind}. Want to fill in the blanks and
				write one?</Text
			>
		{/if}
		<Link href="/write?{kind}_to={storyId}">Write a {kind}</Link>
	</section>
{/snippet}

<div class="continuations">
	<div class="columns">
		{@render column('prequel', prequels)}
		{@render column('sequel', sequels)}
	</div>
	{#if chainHref}<Link href={chainHref}>See the whole chain</Link>{/if}
</div>

<style>
	.continuations {
		display: grid;
		gap: var(--space-4);
	}

	/* One dashed box, split down the middle: what came before, what comes after. */
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.more {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-style: italic;
	}

	.column {
		display: grid;
		gap: var(--space-4);
		align-content: start;
		padding: var(--space-6);
	}

	.column + .column {
		border-left: var(--border-width) dashed var(--color-border-strong);
	}

	h2 {
		color: var(--color-text-muted);
		font-size: var(--text-2xl);
		font-style: italic;
		font-weight: var(--weight-normal);
	}

	strong {
		color: var(--color-accent);
	}

	.column > :global(a) {
		font-size: var(--text-lg);
		font-style: italic;
		text-decoration: underline;
	}

	@media (max-width: 40rem) {
		.columns {
			grid-template-columns: 1fr;
		}

		.column + .column {
			border-top: var(--border-width) dashed var(--color-border-strong);
			border-left: 0;
		}
	}
</style>
