<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { FieldError, Text, TextInput } from '../../atoms/index.ts';

	interface Props {
		id: string;
		name: string;
		/** Small uppercase label above the field, e.g. "Title". */
		label: string;
		value?: string;
		error?: string | null;
		hint?: string;
		placeholder?: string;
		/** lg: big italic type (a story title) · md: regular */
		size?: 'md' | 'lg';
		required?: boolean;
		maxlength?: number;
		type?: 'text' | 'email' | 'url';
		autocomplete?: HTMLInputAttributes['autocomplete'];
	}

	let {
		id,
		name,
		label,
		value = $bindable(''),
		error,
		hint,
		size = 'md',
		...rest
	}: Props = $props();

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<!-- A label over an open line: no box, just a dashed rule to write on. -->
<div class="field {size}">
	<div class="row" class:invalid={Boolean(error)}>
		<label for={id}>{label}</label>
		<TextInput
			{id}
			{name}
			bind:value
			invalid={Boolean(error)}
			aria-describedby={describedby}
			{...rest}
		/>
	</div>
	{#if hint}<span id="{id}-hint"><Text as="span" size="sm" tone="muted">{hint}</Text></span>{/if}
	<FieldError id="{id}-error" message={error} />
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-2);
	}

	.row {
		display: grid;
		gap: var(--space-1);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.row:focus-within {
		border-bottom-color: var(--color-accent);
	}

	.invalid {
		border-bottom-color: var(--color-danger);
	}

	label {
		color: var(--color-accent);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.row :global(input) {
		padding-inline: var(--space-0);
		border: 0;
		border-radius: var(--space-0);
		background: transparent;
		font-size: var(--text-md);
	}

	.row :global(input:focus) {
		box-shadow: none;
	}

	.lg .row :global(input) {
		font-size: var(--text-2xl);
		font-style: italic;
	}
</style>
