<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { Heading, Notice, PageMeta, Text } from '#lib/components/atoms/index.ts';
	import { SearchForm } from '#lib/components/molecules/index.ts';
	import { SearchResults } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title={data.results ? `Search: ${data.results.query}` : 'Search'}
	siteName={PUBLIC_APP_NAME}
/>

<FeedLayout>
	{#if data.results}
		<SearchResults
			query={data.results.query}
			stories={data.results.stories}
			authors={data.results.authors}
			tags={data.results.tags}
			url={page.url}
		/>
	{:else}
		<Heading level={1} size="lg">Search</Heading>
		{#if data.limited}
			<Notice tone="error"
				>You’re searching faster than we allow. Try again in a few minutes.</Notice
			>
		{/if}
		<Text tone="muted"
			>Search story titles and text, authors, and tags. Use at least two characters.</Text
		>
		<SearchForm id="page-search" value={data.raw} />
	{/if}
</FeedLayout>
