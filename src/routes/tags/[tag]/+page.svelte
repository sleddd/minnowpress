<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { Heading, PageMeta } from '#lib/components/atoms/index.ts';
	import { StoryFeed } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title={`#${data.tag}`}
	siteName={PUBLIC_APP_NAME}
	feed={{ href: `/tags/${encodeURIComponent(data.tag)}/feed.xml`, title: `#${data.tag}` }}
/>

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="lg">#{data.tag}</Heading>
	{/snippet}
	<StoryFeed
		label="Stories tagged {data.tag}"
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		empty={{ title: 'No stories with this tag yet' }}
	/>
</FeedLayout>
