<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { Pagination } from '#lib/components/molecules/index.ts';
	import { TagCloud } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Tags" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	<TagCloud title="Tags" tags={data.tags.items} counts headingLevel={1} />
	<Pagination page={data.tags.page} hasMore={data.tags.hasMore} url={page.url} />
</FeedLayout>
