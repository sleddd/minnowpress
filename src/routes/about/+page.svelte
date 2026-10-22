<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { AboutContent } from '#lib/components/organisms/index.ts';
	import { ReadingLayout } from '#lib/components/templates/index.ts';
</script>

<PageMeta title="About" siteName={PUBLIC_APP_NAME} />

<ReadingLayout>
	<AboutContent appName={PUBLIC_APP_NAME} />
</ReadingLayout>
