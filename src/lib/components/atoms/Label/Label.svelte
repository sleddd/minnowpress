<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';

	interface Props extends HTMLLabelAttributes {
		for: string;
		optional?: boolean;
		children: Snippet;
	}

	let { for: htmlFor, optional = false, children, ...rest }: Props = $props();
</script>

<label class="label" for={htmlFor} data-optional={optional ? 'optional' : undefined} {...rest}
	>{@render children()}</label
>

<style>
	.label {
		display: block;
		font-size: var(--text-sm);
		font-weight: var(--weight-medium);
		color: var(--color-text);
	}

	.label[data-optional]::after {
		content: ' (optional)';
		font-weight: var(--weight-normal);
		color: var(--color-text-muted);
	}
</style>
