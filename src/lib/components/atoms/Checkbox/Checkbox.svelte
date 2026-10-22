<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type'> {
		checked?: boolean;
	}

	let { checked = $bindable(false), ...rest }: Props = $props();
</script>

<input class="checkbox" type="checkbox" bind:checked {...rest} />

<style>
	.checkbox {
		width: var(--size-icon);
		height: var(--size-icon);
		margin: var(--space-0);
		accent-color: var(--color-accent);
	}
</style>
