<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import {
		CommentThread,
		Continuations,
		StoryAside,
		StoryView
	} from '#lib/components/organisms/index.ts';
	import { ArticleLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const story = $derived(data.story);
	// Rating returns the new count without reloading the page (see RatingInput).
	let ratingsCount = $derived(data.story.ratingsCount);
	const published = $derived(story.status === 'published');
	const reported = $derived(
		Boolean(form && 'reported' in form && form.reported?.targetType === 'story')
	);
	const commentError = $derived(form && 'errors' in form ? form.errors?.body : undefined);
	const inChain = $derived(
		Boolean(story.chainId && (story.parent || story.prequels.length || story.sequels.length))
	);
</script>

<PageMeta title={story.title} siteName={PUBLIC_APP_NAME} description={story.body.slice(0, 160)} />

{#snippet aside()}
	<StoryAside
		tags={story.tags}
		publishedAt={published ? story.publishedAt : null}
		editedAt={story.editedAt}
		{ratingsCount}
		challenge={story.challenge}
		archive={story.archive}
	/>
{/snippet}

{#snippet below()}
	{#if published && !data.matureHidden}
		<Continuations
			storyId={story.id}
			prequels={story.prequels}
			sequels={story.sequels}
			chainHref={inChain ? `/chain/${story.chainId}?from=${story.id}` : null}
		/>
		<CommentThread
			storyId={story.id}
			comments={data.comments}
			viewerId={data.viewer?.id ?? null}
			isModerator={data.isModerator}
			error={commentError}
		/>
	{/if}
{/snippet}

<ArticleLayout {aside} {below}>
	<StoryView
		{story}
		signedIn={Boolean(data.viewer)}
		isAuthor={data.isAuthor}
		isModerator={data.isModerator}
		rating={data.rating}
		bookmarked={data.bookmarked}
		matureHidden={data.matureHidden}
		{reported}
		onrated={(totals) => (ratingsCount = totals.count)}
	/>
</ArticleLayout>
