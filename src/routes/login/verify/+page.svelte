<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { VerifyLogin } from '#lib/components/organisms/index.ts';
	import { FormLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Sign in" siteName={PUBLIC_APP_NAME} privateUrl />

<FormLayout>
	<VerifyLogin appName={PUBLIC_APP_NAME} token={data.token} email={data.email} next={data.next} />
</FormLayout>
