<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		options: { value: string; label: string }[];
		value?: string;
	}

	// No fallback value: when nothing is bound, Svelte takes the selection from the page as it
	// starts up (the first option, or whatever the reader already picked while it loaded)
	// instead of resetting it.
	let { options, value = $bindable(), ...rest }: Props = $props();
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
