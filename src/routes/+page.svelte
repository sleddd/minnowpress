<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import {
		ChainExplainer,
		ChallengeHeader,
		HomeWelcome,
		StoryColumns
	} from '#lib/components/organisms/index.ts';
	import { HomeLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	siteName={PUBLIC_APP_NAME}
	description="Very short fiction, written by people. Stories of 1,024 characters or less that anyone can continue."
	feed={{ href: '/feed.xml', title: 'Latest stories' }}
/>

<HomeLayout>
	{#snippet hero()}
		<HomeWelcome appName={PUBLIC_APP_NAME} signedIn={Boolean(data.viewer)} />
	{/snippet}
	{#snippet feature()}
		<ChainExplainer />
	{/snippet}
	{#if data.prompt}
		<ChallengeHeader challenge={data.prompt} variant="banner" signedIn={Boolean(data.viewer)} />
	{/if}
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
				blurb: 'Chains growing right now.',
				stories: data.active,
				more: { href: '/stories?tab=active', label: 'More active' }
			},
			{
				title: 'Recent',
				blurb: 'Still warm off the press.',
				stories: data.recent,
				more: { href: '/stories', label: 'More recent' }
			}
		]}
		tags={data.tags}
	/>
</HomeLayout>
