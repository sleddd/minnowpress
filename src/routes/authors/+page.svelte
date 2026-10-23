<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { Heading, PageMeta, Text } from '#lib/components/atoms/index.ts';
	import { AuthorList } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import { pluralize } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Authors" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="xl">Authors</Heading>
		<Text tone="muted">Writers here today, and the Ficly writers whose stories live on.</Text>
	{/snippet}
	<AuthorList
		title="Writing here"
		note={pluralize(data.writerCount, 'writer', 'writers')}
		authors={data.writers}
		layout="grid"
		empty="No one has published here yet. You could be first."
	/>
	<AuthorList
		title="From the Ficly archive"
		note="2009–2014, by most stories"
		authors={data.archive}
		layout="grid"
		empty="The archive hasn't been imported."
		more={data.moreArchive
			? { href: `?show=${data.moreArchive}`, label: 'Show more archive authors', keepScroll: true }
			: null}
	/>
</FeedLayout>
