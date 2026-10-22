<script lang="ts">
	import { Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		title: string;
		message?: string;
		action?: { href: string; label: string };
	}

	let { title, message, action }: Props = $props();
</script>

<div class="empty">
	<Heading level={2} size="sm">{title}</Heading>
	{#if message}<Text tone="muted">{message}</Text>{/if}
	{#if action}<div><Link href={action.href} variant="button">{action.label}</Link></div>{/if}
</div>

<style>
	.empty {
		display: grid;
		justify-items: center;
		gap: var(--space-3);
		padding: var(--space-7) var(--space-4);
		border: var(--border-width) dashed var(--color-border-strong);
		border-radius: var(--radius-md);
		text-align: center;
	}
</style>
