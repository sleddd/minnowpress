<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { Heading, PageMeta } from '#lib/components/atoms/index.ts';
	import { TagList } from '#lib/components/molecules/index.ts';
	import { StoryColumns } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title="Browse stories"
	siteName={PUBLIC_APP_NAME}
	feed={{ href: '/feed.xml', title: 'Latest stories' }}
/>

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="xl">Browse Stories</Heading>
	{/snippet}
	{#snippet feature()}
		<TagList tags={data.tags} />
	{/snippet}
	<StoryColumns
		columns={[
			{
				title: 'Popular',
				blurb: 'The best-rated stories.',
				stories: data.popular,
				more: { href: '/stories?tab=popular', label: 'More popular' }
			},
			{
				title: 'Active',
				blurb: data.activeHasArchivePicks
					? 'Chains growing right now, with favorites from the Ficly archive.'
					: 'Chains growing right now.',
				stories: data.active,
				more: { href: '/stories?tab=active', label: 'More active' }
			},
			{
				title: 'Recent',
				blurb: data.recentHasArchivePicks
					? 'Still warm off the press, with favorites from the Ficly archive.'
					: 'Still warm off the press.',
				stories: data.recent,
				more: { href: '/stories', label: 'More recent' }
			}
		]}
	/>
</FeedLayout>
