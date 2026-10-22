<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { PromptComposer, PromptReviewList } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageMeta title="Prompts · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Prompts"
	description="Challenge ideas waiting for review: AI suggestions and member proposals. Approve one to add it to the line, or reject it."
>
	<PromptReviewList
		prompts={data.prompts}
		suggestedStart={data.suggestedStart}
		error={form && 'reviewError' in form ? form.reviewError : null}
	/>
	{#snippet aside()}
		<PromptComposer
			canGenerate={data.canGenerate}
			errors={form && 'errors' in form ? form.errors : {}}
			generated={form && 'generated' in form ? form.generated : null}
		/>
	{/snippet}
</AdminLayout>
