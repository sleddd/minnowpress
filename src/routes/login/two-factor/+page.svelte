<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { TwoFactorPrompt } from '#lib/components/organisms/index.ts';
	import { FormLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<PageMeta title="Two-step sign-in" siteName={PUBLIC_APP_NAME} privateUrl />

<FormLayout>
	<TwoFactorPrompt next={data.next} error={form?.error ?? null} />
</FormLayout>
