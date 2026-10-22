<script lang="ts">
	import { page } from '$app/state';
	import { ErrorMessage } from '#lib/components/organisms/index.ts';
	import { FeedLayout } from '#lib/components/templates/index.ts';
</script>

<FeedLayout>
	<ErrorMessage status={page.status} message={page.error?.message} />
</FeedLayout>
