<script lang="ts">
	import { enhance } from '$app/forms';
	import { archiveAuthorPath } from '#lib/archive.ts';
	import { excerpt, pluralize } from '#lib/format.ts';
	import type { StoryDetailView } from '#lib/types.ts';
	import {
		Avatar,
		Badge,
		Eyebrow,
		Button,
		Link,
		Notice,
		Prose,
		RatingFish,
		Text
	} from '../../atoms/index.ts';
	import { BookmarkButton, RatingInput, ReportForm } from '../../molecules/index.ts';

	interface Props {
		story: StoryDetailView;
		signedIn: boolean;
		isAuthor: boolean;
		isModerator: boolean;
		/** The viewer's own rating. */
		rating?: number | null;
		bookmarked?: boolean;
		reported?: boolean;
		/** A mature story the viewer hasn't opted in to: its text was withheld. */
		matureHidden?: boolean;
		/** Called with the story's new totals after the viewer rates it. */
		onrated?: (totals: { count: number; average: number | null }) => void;
	}

	let {
		story,
		signedIn,
		isAuthor,
		isModerator,
		rating = null,
		bookmarked = false,
		reported = false,
		matureHidden = false,
		onrated
	}: Props = $props();

	const published = $derived(story.status === 'published');
	const authorName = $derived(story.archive?.author ?? story.author.displayName);
	const authorHref = $derived(
		story.archive ? archiveAuthorPath(story.archive.authorUrl) : `/@${story.author.username}`
	);
	const bio = $derived(story.archive ? null : story.author.bio?.trim() || null);
	// A new rating brings back the story's totals; shown here until the page next loads.
	let average = $derived(story.averageRating);
	let ratingsCount = $derived(story.ratingsCount);
</script>

<article class="story" aria-labelledby="story-title">
	{#if story.status === 'draft'}
		<Notice>This is a draft. Only you can see it.</Notice>
	{/if}

	<h1 id="story-title">{story.title}</h1>

	<div class="author">
		<Avatar
			name={authorName}
			src={story.archive ? null : story.author.avatarUrl}
			size="lg"
			shape="square"
		/>
		<div class="who">
			<Text>
				<span class="label">Author:</span>
				{#if authorHref}<Link href={authorHref}><em>{authorName}</em></Link>{:else}<em
						>{authorName}</em
					>{/if}
			</Text>
			{#if bio}
				<Text size="sm" tone="muted">{excerpt(bio, 140)}</Text>
				<Link href="/@{story.author.username}" variant="subtle">Read bio</Link>
			{/if}
		</div>
	</div>

	{#if story.isMature}<div><Badge tone="warning">Mature</Badge></div>{/if}

	{#if matureHidden}
		<Notice>
			This story is marked mature.
			{#if signedIn}
				<Link href="/settings">Turn on mature stories in Settings</Link> to read it.
			{:else}
				<Link href="/login?next=/s/{story.id}">Sign in</Link> and turn on mature stories in Settings to
				read it.
			{/if}
		</Notice>
	{:else}
		<div class="body"><Prose text={story.body} /></div>
	{/if}

	{#if published}
		<div class="ratings">
			<div class="average">
				<Eyebrow tone="muted">Average reader rating</Eyebrow>
				<p class="score">
					<RatingFish value={average} />
					<span
						>{average === null
							? 'Not rated yet'
							: `${average} · rated ${pluralize(ratingsCount, 'time')}`}</span
					>
				</p>
			</div>
			<RatingInput
				storyId={story.id}
				score={rating}
				{signedIn}
				{isAuthor}
				onrated={(totals) => {
					average = totals.average;
					ratingsCount = totals.count;
					onrated?.(totals);
				}}
			/>
		</div>

		<div class="actions links">
			<BookmarkButton storyId={story.id} {bookmarked} {signedIn} />
			{#if isAuthor && !story.archive}<Link href="/write?edit={story.id}">Edit story</Link>{/if}
			{#if signedIn && !isAuthor}
				<ReportForm
					action="/s/{story.id}?/report"
					targetType="story"
					targetId={story.id}
					{reported}
				/>
			{/if}
			{#if isModerator}
				<form method="POST" action="/s/{story.id}?/mature" use:enhance>
					<input type="hidden" name="mature" value={story.matureLocked ? 'false' : 'true'} />
					<Button type="submit" variant="ghost" size="sm"
						>{story.matureLocked ? 'Clear mature (moderator)' : 'Mark mature (moderator)'}</Button
					>
				</form>
				<form method="POST" action="/s/{story.id}?/remove" use:enhance>
					<Button type="submit" variant="ghost" size="sm">Remove (moderator)</Button>
				</form>
			{/if}
			{#if isAuthor && published && !story.archive}
				<details class="delete">
					<summary>Delete this story</summary>
					<form method="POST" action="/s/{story.id}?/delete">
						<Text size="sm">
							This can’t be undone. Its comments and ratings go with it; prequels and sequels other
							people wrote stay up.
						</Text>
						<div><Button type="submit" variant="danger" size="sm">Delete for good</Button></div>
					</form>
				</details>
			{/if}
			<span class="spacer"></span>
			<Link href="#comments">{pluralize(story.commentsCount, 'comment')}</Link>
		</div>
	{/if}

	{#if isAuthor && story.status === 'draft'}
		<div class="actions">
			<Link href="/write?edit={story.id}" variant="button">Edit draft</Link>
			<form method="POST" action="/s/{story.id}?/publish" use:enhance>
				<Button type="submit" variant="secondary">Publish</Button>
			</form>
			<form method="POST" action="/s/{story.id}?/delete">
				<Button type="submit" variant="ghost">Delete draft</Button>
			</form>
		</div>
	{/if}
</article>

<style>
	.story {
		display: grid;
		gap: var(--space-6);
	}

	h1 {
		color: var(--color-display);
		font-size: var(--text-story-title);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
		text-wrap: balance;
	}

	.author {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}

	.who {
		display: grid;
		gap: var(--space-1);
		justify-items: start;
	}

	.label {
		color: var(--color-text-muted);
	}

	.body :global(.prose) {
		font-size: var(--text-story);
		line-height: var(--leading-prose);
	}

	/* Two halves between dashed rules: the readers' average, then yours. */
	.ratings {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-block: var(--border-width) dashed var(--color-border-strong);
	}

	.ratings > :global(*) {
		display: grid;
		gap: var(--space-2);
		align-content: start;
		padding: var(--space-5) var(--space-6);
	}

	.ratings > :global(:first-child) {
		padding-left: var(--space-0);
	}

	.ratings > :global(* + *) {
		border-left: var(--border-width) dashed var(--color-border-strong);
	}

	.score {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-muted);
		font-style: italic;
	}

	/* One row of quiet italic links: save, edit, report, moderate, delete … comments. */
	.links {
		gap: var(--space-2) var(--space-6);
		padding-bottom: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
		font-size: var(--text-md);
		font-style: italic;
	}

	.links :global(button),
	.links :global(summary),
	.links :global(a) {
		padding: var(--space-0);
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		text-decoration: none;
	}

	.links :global(a[href='#comments']),
	.links :global(a[href^='/write']) {
		color: var(--color-accent);
	}

	.links :global(details[open]) {
		flex-basis: 100%;
		order: 10;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.delete summary {
		cursor: pointer;
	}

	.delete form {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
		margin-top: var(--space-3);
		padding: var(--space-4);
		border: var(--border-width) dashed var(--color-danger);
	}

	.spacer {
		flex: 1;
	}

	@media (max-width: 40rem) {
		.ratings {
			grid-template-columns: 1fr;
		}

		.ratings > :global(*) {
			padding-inline: var(--space-0);
		}

		.ratings > :global(* + *) {
			border-top: var(--border-width) dashed var(--color-border-strong);
			border-left: 0;
		}
	}

	@media (max-width: 52rem) {
		.body :global(.prose) {
			font-size: var(--text-story);
		}
	}
</style>
