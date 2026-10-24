<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import {
		ActivityList,
		DeskHeader,
		DeskPanel,
		DeskStories,
		FollowingPanel
	} from '#lib/components/organisms/index.ts';
	import { DeskLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Your desk" siteName={PUBLIC_APP_NAME} />

<DeskLayout>
	{#snippet header()}
		<DeskHeader name={data.viewer?.displayName ?? ''} />
	{/snippet}
	{#snippet stories()}
		<DeskStories username={data.viewer?.username ?? ''} stories={data.stories} />
	{/snippet}
	{#snippet activity()}
		<ActivityList
			items={data.activity}
			more={data.activity.length ? { href: '/desk/activity', label: 'All activity' } : null}
		/>
	{/snippet}
	{#snippet aside()}
		{#if data.viewer}<DeskPanel
				username={data.viewer.username}
				counts={data.counts}
				following={data.following}
			/>{/if}
	{/snippet}
	<FollowingPanel items={data.fromFollowed} suggestions={data.suggested} />
</DeskLayout>
