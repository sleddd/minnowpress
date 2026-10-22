<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ChallengeManager } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageMeta title="Challenges · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Challenges"
	description="Close the open challenge early to move straight to the next one in line, or delete any challenge made here. Ficly archive challenges aren’t listed."
>
	<ChallengeManager
		open={data.open}
		upcoming={data.upcoming}
		closed={data.closed}
		page={data.page}
		hasMore={data.hasMore}
		url={page.url}
		message={form && 'message' in form ? form.message : null}
		datesError={form && 'datesError' in form ? form.datesError : null}
	/>
</AdminLayout>
