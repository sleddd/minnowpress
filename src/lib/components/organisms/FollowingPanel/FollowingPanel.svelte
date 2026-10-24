<script lang="ts">
	import type { AuthorEntryView, FeedItemView } from '#lib/types.ts';
	import { Heading, Link } from '../../atoms/index.ts';
	import { AuthorListItem, FollowButton, StoryListItem } from '../../molecules/index.ts';

	interface Props {
		/** Latest stories from people the member follows. */
		items: FeedItemView[];
		/** Writers to start with when there's nothing yet. */
		suggestions?: AuthorEntryView[];
	}

	let { items, suggestions = [] }: Props = $props();
</script>

<section class="following" aria-labelledby="following-title">
	<div class="head">
		<Heading level={2} size="lg" id="following-title">From people you follow</Heading>
		{#if items.length}<Link href="/stories?tab=following">See all</Link>{/if}
	</div>

	{#if items.length}
		<ol class="stories" role="list">
			{#each items as story (story.id)}<li><StoryListItem {story} /></li>{/each}
		</ol>
	{:else}
		<div class="empty">
			<p class="lead">
				<strong>Nothing here yet.</strong> Stories from writers you follow will show up here.
			</p>
			{#if suggestions.length}
				<p class="start">A few to start with:</p>
				<ul class="writers" role="list">
					{#each suggestions as author (author.href)}
						<li class="writer">
							<AuthorListItem {author} />
							{#if author.username}
								<FollowButton username={author.username} following={false} signedIn look="quiet" />
							{:else}
								<Link href={author.href}>read</Link>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<p><Link href="/authors">Find more writers</Link></p>
		</div>
	{/if}
</section>

<style>
	.following {
		display: grid;
		gap: var(--space-5);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.stories li {
		padding-block: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.stories li:first-child {
		padding-top: var(--space-0);
	}

	.empty {
		display: grid;
		gap: var(--space-4);
		padding: var(--space-6);
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.lead {
		font-size: var(--text-lg);
	}

	.lead strong {
		color: var(--color-accent);
	}

	.start {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.writers {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
		gap: var(--space-4) var(--space-7);
	}

	.writer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.empty :global(a[href='/authors']),
	.writer > :global(a) {
		font-style: italic;
	}
</style>
