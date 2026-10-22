<script lang="ts">
	import { FieldError, Label, Text, TextArea, TextInput } from '../../atoms/index.ts';

	interface Props {
		id: string;
		name: string;
		label: string;
		type?: 'text' | 'email' | 'url' | 'date' | 'textarea';
		value?: string;
		error?: string | null;
		hint?: string;
		optional?: boolean;
		required?: boolean;
		rows?: number;
		maxlength?: number;
		placeholder?: string;
		autocomplete?: HTMLInputElement['autocomplete'];
	}

	let {
		id,
		name,
		label,
		type = 'text',
		value = $bindable(''),
		error,
		hint,
		optional = false,
		rows,
		...rest
	}: Props = $props();

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field">
	<Label for={id} {optional}>{label}</Label>
	{#if hint}<span id="{id}-hint"><Text as="span" tone="muted" size="sm">{hint}</Text></span>{/if}
	{#if type === 'textarea'}
		<TextArea
			{id}
			{name}
			{rows}
			bind:value
			invalid={Boolean(error)}
			aria-describedby={describedby}
			{...rest}
		/>
	{:else}
		<TextInput
			{id}
			{name}
			{type}
			bind:value
			invalid={Boolean(error)}
			aria-describedby={describedby}
			{...rest}
		/>
	{/if}
	<FieldError id="{id}-error" message={error} />
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-1);
	}
</style>
