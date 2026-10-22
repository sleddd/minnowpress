<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ArchiveAuthor, StoryFeed } from '#lib/components/organisms/index.ts';
	import { ArticleLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title={data.author.name} siteName={PUBLIC_APP_NAME} />

{#snippet aside()}
	<ArchiveAuthor author={data.author} part="card" />
{/snippet}

<ArticleLayout {aside} divided>
	<ArchiveAuthor author={data.author} part="header" />
	<StoryFeed
		label="Stories by {data.author.name}"
		showAuthor={false}
		items={data.feed.items}
		page={data.feed.page}
		hasMore={data.feed.hasMore}
		url={page.url}
		empty={{ title: 'No stories to show' }}
	/>
</ArticleLayout>
