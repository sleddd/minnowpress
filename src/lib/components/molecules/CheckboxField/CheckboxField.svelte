<script lang="ts">
	import { Checkbox, FieldError, Label, Text } from '../../atoms/index.ts';

	interface Props {
		id: string;
		name: string;
		label: string;
		hint?: string;
		checked?: boolean;
		required?: boolean;
		disabled?: boolean;
		error?: string;
		/** sm: compact, beside other controls (the default) · md: larger, as the settings page uses */
		size?: 'sm' | 'md';
	}

	let {
		id,
		name,
		label,
		hint,
		checked = $bindable(false),
		required = false,
		disabled = false,
		error,
		size = 'sm'
	}: Props = $props();

	const describedBy = $derived(
		[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
			undefined
	);
</script>

<div class="field {size}">
	<Checkbox
		{id}
		{name}
		bind:checked
		{required}
		{disabled}
		aria-invalid={error ? true : undefined}
		aria-describedby={describedBy}
	/>
	<div>
		<Label for={id}>{label}</Label>
		{#if hint}<span id="{id}-hint"><Text as="span" tone="muted" size="sm">{hint}</Text></span>{/if}
		<FieldError id="{id}-error" message={error} />
	</div>
</div>

<style>
	.field {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.md {
		gap: var(--space-3);
	}

	.md :global(input) {
		width: var(--text-lg);
		height: var(--text-lg);
		margin-top: var(--space-1);
	}

	.md :global(label) {
		font-size: var(--text-lg);
		font-weight: var(--weight-normal);
	}
</style>
