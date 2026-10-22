<script lang="ts">
	import { Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		status: number;
		message?: string;
	}

	let { status, message }: Props = $props();

	const title = $derived(
		status === 404 ? 'Page not found' : status === 403 ? 'Not allowed' : 'Something went wrong'
	);
</script>

<section class="error" aria-labelledby="error-title">
	<Text tone="muted" size="sm">Error {status}</Text>
	<Heading level={1} id="error-title">{title}</Heading>
	{#if message && message !== title}<Text>{message}</Text>{/if}
	<Link href="/">Back to stories</Link>
</section>

<style>
	.error {
		display: grid;
		justify-items: start;
		gap: var(--space-3);
		padding-block: var(--space-7);
	}
</style>
