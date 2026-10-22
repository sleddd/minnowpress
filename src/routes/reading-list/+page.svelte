<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { Heading, PageMeta, Text } from '#lib/components/atoms/index.ts';
	import { StoryFeed } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Reading list" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="lg">Reading list</Heading>
		<Text tone="muted">Stories you've saved, most recent first.</Text>
	{/snippet}
	<StoryFeed
		label="Saved stories"
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		empty={{
			title: 'Nothing saved yet',
			message: 'Use Save on any story to read it later.',
			action: { href: '/', label: 'Browse stories' }
		}}
	/>
</FeedLayout>
