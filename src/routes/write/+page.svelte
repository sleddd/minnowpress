<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ChallengeHeader, DeskPanel, StoryEditor } from '#lib/components/organisms/index.ts';
	import { EditorLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form && 'values' in form && form.values ? form.values : data.values);
	const errors = $derived(form && 'errors' in form ? form.errors : {});
</script>

<PageMeta title="Write" siteName={PUBLIC_APP_NAME} />

{#snippet aside()}
	{#if data.prompt}<ChallengeHeader challenge={data.prompt} variant="banner" signedIn />{/if}
	{#if data.viewer}<DeskPanel username={data.viewer.username} counts={data.counts} />{/if}
{/snippet}

<EditorLayout {aside}>
	{#key values}
		<StoryEditor
			appName={PUBLIC_APP_NAME}
			{values}
			{errors}
			continuing={data.continuing}
			challenges={data.challenges}
			editId={data.editId}
			editingPublished={data.editingPublished}
			matureLocked={data.matureLocked}
			adultConfirmed={data.adultConfirmed}
		/>
	{/key}
</EditorLayout>
