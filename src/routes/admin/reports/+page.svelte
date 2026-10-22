<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { ReportQueue } from '#lib/components/organisms/index.ts';
	import { AdminLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageMeta title="Reports · Admin" siteName={PUBLIC_APP_NAME} />

<AdminLayout
	title="Reports"
	description="Stories and comments readers have flagged. Remove anything that breaks the rules, or dismiss the report."
>
	<ReportQueue reports={data.reports} />
</AdminLayout>
