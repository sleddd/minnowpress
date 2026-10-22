<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { page } from '$app/state';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ChallengeList } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Challenges" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	<ChallengeList
		open={data.open}
		upcoming={data.upcoming}
		closed={data.closed}
		page={data.page}
		hasMore={data.hasMore}
		url={page.url}
		signedIn={Boolean(data.viewer)}
	/>
</FeedLayout>
