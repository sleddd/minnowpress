<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { Link, PageMeta } from '#lib/components/atoms/index.ts';
	import { ActivityList } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const next = $derived(data.activity.next);
</script>

<PageMeta title="Your activity" siteName={PUBLIC_APP_NAME} />

<FeedLayout>
	{#snippet intro()}
		<Link href={data.older ? '/desk/activity' : '/desk'} variant="subtle"
			>{data.older ? '← Newest activity' : '← Your desk'}</Link
		>
	{/snippet}
	<ActivityList
		items={data.activity.items}
		title="Your activity"
		level={1}
		more={next
			? { href: `/desk/activity?before=${next.getTime()}`, label: 'Older activity' }
			: null}
	/>
</FeedLayout>
