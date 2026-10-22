<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { page } from '$app/state';
	import { ProfileHeader, StoryFeed } from '#lib/components/organisms/index.ts';
	import { ProfileLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title={`${data.profile.displayName} (@${data.profile.username})`}
	siteName={PUBLIC_APP_NAME}
	feed={{
		href: `/@${data.profile.username}/feed.xml`,
		title: `Stories by ${data.profile.displayName}`
	}}
/>

<ProfileLayout>
	{#snippet sidebar()}
		<ProfileHeader
			profile={data.profile}
			counts={data.counts}
			isSelf={data.isSelf}
			following={data.following}
			signedIn={Boolean(data.viewer)}
			moderation={data.moderation}
		/>
	{/snippet}
	{#if data.drafts.length}
		<StoryFeed
			id="drafts"
			label="Your drafts"
			title="Drafts"
			note="only you can see these"
			showAuthor={false}
			items={data.drafts}
			page={1}
			hasMore={false}
			url={page.url}
			empty={{ title: '' }}
		/>
	{/if}
	<StoryFeed
		label="Stories by {data.profile.displayName}"
		title="Stories"
		note="by {data.profile.displayName}"
		showAuthor={false}
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		empty={data.isSelf
			? {
					title: "You haven't published anything yet",
					action: { href: '/write', label: 'Write a story' }
				}
			: { title: 'No stories yet' }}
	/>
</ProfileLayout>
