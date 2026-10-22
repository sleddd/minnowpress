<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { BlogEditor } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form && 'values' in form && form.values ? form.values : data.values);
	const saved = $derived(Boolean(form && 'saved' in form) || page.url.searchParams.has('saved'));
</script>

<PageMeta title={data.post ? 'Edit post' : 'New post'} siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title={data.post ? 'Edit post' : 'New post'}
	description="Posts are plain text: a blank line starts a new paragraph."
>
	{#key values}
		<BlogEditor
			{values}
			errors={form && 'errors' in form ? form.errors : {}}
			post={data.post}
			{saved}
		/>
	{/key}
</AdminLayout>
