<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { HelpContent } from '#lib/components/organisms/index.ts';
	import { ReadingLayout } from '#lib/components/templates/index.ts';
</script>

<PageMeta title="Help" siteName={PUBLIC_APP_NAME} />

<ReadingLayout>
	<HelpContent appName={PUBLIC_APP_NAME} />
</ReadingLayout>
