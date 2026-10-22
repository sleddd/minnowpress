<script lang="ts">
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { TermsContent } from '#lib/components/organisms/index.ts';
	import { ReadingLayout } from '#lib/components/templates/index.ts';
</script>

<PageMeta title="Terms" siteName={PUBLIC_APP_NAME} />

<ReadingLayout>
	<TermsContent appName={PUBLIC_APP_NAME} />
</ReadingLayout>
