<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type'> {
		type?: 'text' | 'email' | 'url' | 'search' | 'date' | 'password';
		invalid?: boolean;
		value?: string;
	}

	let { type = 'text', invalid = false, value = $bindable(''), ...rest }: Props = $props();
</script>

<input class="input" {type} aria-invalid={invalid || undefined} bind:value {...rest} />

<style>
	.input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}

	.input:focus {
		border-color: var(--color-focus);
	}

	.input[aria-invalid='true'] {
		border-color: var(--color-danger);
	}
</style>
