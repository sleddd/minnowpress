<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { pluralize } from '#lib/format.ts';
	import { Heading, PageMeta, Text } from '#lib/components/atoms/index.ts';
	import { ChainTree } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title={`The ${data.root.title} chain`} siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	{#snippet intro()}
		<Heading level={1} size="lg">The “{data.root.title}” chain</Heading>
		<Text tone="muted">{pluralize(data.count, 'story', 'stories')}, each continuing another.</Text>
	{/snippet}
	<ChainTree nodes={data.nodes} currentId={data.currentId} />
</FeedLayout>
