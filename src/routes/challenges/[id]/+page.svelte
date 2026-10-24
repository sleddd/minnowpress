<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ConfirmForm } from '#lib/components/molecules/index.ts';
	import { page } from '$app/state';
	import { pluralize } from '#lib/format.ts';
	import { ChallengeHeader, StoryFeed } from '#lib/components/organisms/index.ts';
	import { ArticleLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title={`${data.challenge.title} · Challenges`}
	siteName={PUBLIC_APP_NAME}
	feed={{
		href: `/challenges/${data.challenge.id}/feed.xml`,
		title: `Entries for ${data.challenge.title}`
	}}
/>

{#snippet aside()}
	<ChallengeHeader
		challenge={data.challenge}
		variant="facts"
		signedIn={Boolean(data.viewer)}
		appName={PUBLIC_APP_NAME}
	/>
	{#if data.isModerator}
		<ConfirmForm
			label="Remove challenge (moderator)"
			message="It disappears from the site. Stories written for it stay up, without the link."
			action="?/remove"
			confirm="Remove challenge"
		/>
	{/if}
{/snippet}

<ArticleLayout {aside} divided>
	<ChallengeHeader challenge={data.challenge} signedIn={Boolean(data.viewer)} />
	<StoryFeed
		label="Challengers"
		title="Challengers"
		note={pluralize(data.challenge.entries ?? 0, 'entry', 'entries')}
		quietEmpty
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		empty={{ title: 'No entries yet.', message: 'Be the first to answer this prompt.' }}
	/>
</ArticleLayout>
