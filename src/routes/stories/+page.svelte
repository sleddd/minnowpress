<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { Heading, PageMeta } from '#lib/components/atoms/index.ts';
	import { StoryFeed, TabNav } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tabList = $derived([
		{ href: '/stories', label: 'Latest', current: data.tab === 'latest' },
		{ href: '/stories?tab=popular', label: 'Popular', current: data.tab === 'popular' },
		{ href: '/stories?tab=active', label: 'Active', current: data.tab === 'active' },
		...(data.viewer
			? [{ href: '/stories?tab=following', label: 'Following', current: data.tab === 'following' }]
			: [])
	]);
	const empty = $derived(
		data.tab === 'following'
			? {
					title: 'Nothing from people you follow yet',
					message: 'Follow writers from their profile pages.'
				}
			: {
					title: 'No stories yet',
					message: 'Be the first to write one.',
					action: { href: '/write', label: 'Write a story' }
				}
	);
</script>

<PageMeta
	title="Stories"
	siteName={PUBLIC_APP_NAME}
	feed={{ href: '/feed.xml', title: 'Latest stories' }}
/>

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="xl">Stories</Heading>
	{/snippet}
	{#snippet tabs()}
		<TabNav label="Feeds" tabs={tabList} />
	{/snippet}
	<StoryFeed
		label="Stories"
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		{empty}
	/>
</FeedLayout>
