<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		options: { value: string; label: string }[];
		value?: string;
	}

	let { options, value = $bindable(options[0]?.value ?? ''), ...rest }: Props = $props();
</script>

<select class="select" bind:value {...rest}>
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>

<style>
	.select {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}
</style>
