<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ModerationLog } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Log · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Log"
	description="Every moderator action, newest first: who did what, and to which story, comment or member."
>
	<ModerationLog
		entries={data.log.items}
		page={data.log.page}
		hasMore={data.log.hasMore}
		url={page.url}
	/>
</AdminLayout>
