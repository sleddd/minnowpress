<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { BlogArticle } from '#lib/components/organisms/index.ts';
	import { ReadingLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta
	title={data.post.title}
	siteName={PUBLIC_APP_NAME}
	description={data.post.body.slice(0, 160)}
/>

<ReadingLayout>
	<BlogArticle post={data.post} previous={data.previous} canEdit={data.canEdit} />
</ReadingLayout>
