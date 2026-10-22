<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { Heading, PageMeta, Text } from '#lib/components/atoms/index.ts';
	import { Pagination } from '#lib/components/molecules/index.ts';
	import { AuthorList } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Authors" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="xl">Authors</Heading>
		<Text tone="muted">Writers here today, and the Ficly writers whose stories live on.</Text>
	{/snippet}
	{#if data.page === 1}
		<AuthorList
			title="Writing here"
			authors={data.writers}
			layout="grid"
			empty="No one has published here yet. You could be first."
		/>
	{/if}
	<AuthorList
		title="From the Ficly archive"
		authors={data.archive}
		layout="grid"
		empty="The archive hasn't been imported."
	/>
	<Pagination page={data.page} hasMore={data.hasMore} url={page.url} />
</FeedLayout>
