<script lang="ts">
	import { pluralize } from '#lib/format.ts';
	import { archiveAuthorPath } from '#lib/archive.ts';
	import { Avatar, Heading, Link } from '../../atoms/index.ts';
	import { FollowButton } from '../../molecules/index.ts';

	interface Props {
		author: {
			name: string;
			url: string;
			stories: number;
			firstYear?: number | null;
			lastYear?: number | null;
		};
		/** header: ribbon, name, and credit · card: the sidebar summary */
		part: 'header' | 'card';
		/** Whether the viewer follows this author (header only). */
		following?: boolean;
		signedIn?: boolean;
	}

	let { author, part, following = false, signedIn = false }: Props = $props();

	const path = $derived(archiveAuthorPath(author.url));

	const years = $derived(
		author.firstYear && author.lastYear
			? author.firstYear === author.lastYear
				? `${author.firstYear}`
				: `${author.firstYear}–${author.lastYear}`
			: '2009–2014'
	);
</script>

{#if part === 'header'}
	<header class="header">
		<span class="flag">from the Ficly archive</span>
		<Heading level={1} size="xl">{author.name}</Heading>
		<p class="credit">
			{pluralize(author.stories, 'story', 'stories')} written on Ficly, {years}, shared under CC
			BY-SA 3.0.
			<Link href={author.url} rel="noopener">Their page on ficly.com</Link>
		</p>
		{#if path}<FollowButton username={author.name} {path} {following} {signedIn} />{/if}
	</header>
{:else}
	<section class="card" aria-label="About {author.name}">
		<Avatar name={author.name} size="xl" />
		<p class="count"><strong>{author.stories}</strong> <span>stories, {years}</span></p>
		<p class="note">
			Archived authors can’t write new stories, but anyone can still write a prequel or sequel to
			theirs.
		</p>
	</section>
{/if}

<style>
	.header {
		display: grid;
		gap: var(--space-4);
		justify-items: start;
		padding-bottom: var(--space-6);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.flag {
		--notch: var(--space-3);
		--pad-end: calc(var(--notch) + var(--space-5));

		padding: var(--space-2) var(--pad-end) var(--space-2) var(--space-5);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-style: italic;
		font-weight: var(--weight-bold);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.header :global(h1) {
		font-size: var(--text-story-title);
	}

	.credit {
		color: var(--color-text-muted);
	}

	.credit :global(a) {
		font-style: italic;
	}

	.card {
		display: grid;
		gap: var(--space-3);
		justify-items: start;
	}

	.card :global(.avatar) {
		border-radius: var(--radius-full);
	}

	.count {
		display: grid;
	}

	.count strong {
		color: var(--color-accent);
		font-size: var(--text-3xl);
		line-height: var(--leading-tight);
	}

	.count span {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.note {
		color: var(--color-text-muted);
		font-style: italic;
	}
</style>
