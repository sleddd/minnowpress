<script lang="ts">
	interface Props {
		id: string;
		message?: string | null;
	}

	let { id, message }: Props = $props();
</script>

{#if message}
	<p class="error" {id}>{message}</p>
{/if}

<style>
	.error {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--color-danger);
	}
</style>
