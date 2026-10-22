<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { BlogList } from '#lib/components/organisms/index.ts';
	import { ReadingLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Blog" siteName={PUBLIC_APP_NAME} />

<ReadingLayout>
	<BlogList
		posts={data.posts.items}
		page={data.posts.page}
		hasMore={data.posts.hasMore}
		url={page.url}
	/>
</ReadingLayout>
