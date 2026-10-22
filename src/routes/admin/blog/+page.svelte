<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { Link, PageMeta } from '#lib/components/atoms/index.ts';
	import { BlogAdminList } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Blog · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Blog posts"
	description="News and notes for The Minnow Pond. The newest post also shows on everyone’s desk."
>
	{#snippet action()}
		<Link href="/admin/blog/new" variant="ribbon">new post</Link>
	{/snippet}
	<BlogAdminList posts={data.posts} />
</AdminLayout>
