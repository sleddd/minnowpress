<script lang="ts">
	import type { AuthorEntryView } from '#lib/types.ts';
	import { Heading, Link, Text } from '../../atoms/index.ts';
	import { AuthorListItem } from '../../molecules/index.ts';

	interface Props {
		username: string;
		counts: { drafts: number; published: number };
		/** When given (on the desk), lists the people the member follows. */
		following?: AuthorEntryView[] | null;
	}

	let { username, counts, following = null }: Props = $props();
</script>

<div class="desk">
	<nav class="links" aria-labelledby="desk-title">
		<Heading level={2} size="md" id="desk-title">Your Desk</Heading>
		<ul role="list">
			<li><Link href="/settings">Edit your profile</Link></li>
			<li><Link href="/write">Write a new story</Link></li>
			<li><Link href="/challenges/new">Create a new challenge</Link></li>
			<li><Link href="/@{username}#drafts">Drafts ({counts.drafts})</Link></li>
		</ul>
		<Heading level={3} size="md">Your Library</Heading>
		<ul role="list">
			<li><Link href="/@{username}">Published stories ({counts.published})</Link></li>
			<li><Link href="/reading-list">Reading list</Link></li>
		</ul>
	</nav>
	{#if following}
		<section class="people" aria-labelledby="following-people-title">
			<Heading level={2} size="md" id="following-people-title">People you follow</Heading>
			{#if following.length}
				<ul class="authors" role="list">
					{#each following as author (author.href)}<li><AuthorListItem {author} /></li>{/each}
				</ul>
			{:else}
				<Text size="sm" tone="muted">No one yet. Follow writers from their profile pages.</Text>
			{/if}
			<p class="all"><Link href="/authors">All authors</Link></p>
		</section>
	{/if}
</div>

<style>
	.desk {
		display: grid;
		gap: var(--space-7);
		align-content: start;
	}

	.links,
	.people {
		display: grid;
		gap: var(--space-3);
		align-content: start;
	}

	ul {
		display: grid;
		gap: var(--space-2);
	}

	/* Room above "Your Library" so the two lists read as separate sections. */
	ul + :global(h3) {
		margin-top: var(--space-5);
	}

	.links ul :global(a) {
		font-style: italic;
	}

	.authors {
		gap: var(--space-3);
	}

	.all :global(a) {
		font-style: italic;
		text-decoration: underline;
	}
</style>
