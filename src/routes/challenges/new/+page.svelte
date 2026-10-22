<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ChallengeProposalForm } from '#lib/components/organisms/index.ts';
	import { FormLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<PageMeta title="Create a challenge" siteName={PUBLIC_APP_NAME} />

<FormLayout>
	{#key form}
		<ChallengeProposalForm
			values={form && 'values' in form ? form.values : undefined}
			errors={form && 'errors' in form ? form.errors : {}}
			proposed={Boolean(form && 'proposed' in form && form.proposed)}
		/>
	{/key}
</FormLayout>
