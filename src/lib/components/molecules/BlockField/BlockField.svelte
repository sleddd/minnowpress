<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { FieldError, Text, TextArea, TextInput } from '../../atoms/index.ts';

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
		optional?: boolean;
		maxlength?: number;
		type?: 'text' | 'email' | 'url';
		autocomplete?: HTMLInputAttributes['autocomplete'];
		inputmode?: HTMLInputAttributes['inputmode'];
		/** Fixed text before what's typed, e.g. "minnowpress.com/@" for a username. */
		prefix?: string;
		/** Several lines in a dashed box instead of one line on a rule, e.g. a bio. */
		rows?: number;
	}

	let {
		id,
		name,
		label,
		value = $bindable(''),
		error,
		hint,
		size = 'md',
		optional = false,
		prefix,
		rows,
		...rest
	}: Props = $props();

	const describedby = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<!-- A label over an open line: no box, just a dashed rule to write on. -->
<div class="field {size}">
	<label for={id}
		>{label}{#if optional}<em class="optional">(optional)</em>{/if}</label
	>
	{#if rows}
		<div class="box" class:invalid={Boolean(error)}>
			<TextArea
				{id}
				{name}
				{rows}
				bind:value
				invalid={Boolean(error)}
				aria-describedby={describedby}
				{...rest}
			/>
		</div>
	{:else}
		<div class="line" class:invalid={Boolean(error)}>
			{#if prefix}<span class="prefix" aria-hidden="true">{prefix}</span>{/if}
			<TextInput
				{id}
				{name}
				bind:value
				invalid={Boolean(error)}
				aria-describedby={describedby}
				{...rest}
			/>
		</div>
	{/if}
	{#if hint}<span id="{id}-hint"><Text as="span" size="sm" tone="muted">{hint}</Text></span>{/if}
	<FieldError id="{id}-error" message={error} />
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-2);
	}

	label {
		color: var(--color-accent);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.optional {
		margin-inline-start: var(--space-2);
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
		letter-spacing: normal;
		text-transform: none;
	}

	.line {
		display: flex;
		align-items: baseline;
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.box {
		border: var(--border-width) dashed var(--color-border-strong);
		background: var(--color-surface);
	}

	.line:focus-within,
	.box:focus-within {
		border-color: var(--color-accent);
	}

	.prefix {
		color: var(--color-text-muted);
		font-size: var(--text-lg);
		white-space: nowrap;
	}

	.line :global(input) {
		min-width: 0;
		padding-inline: var(--space-0);
		border: 0;
		border-radius: var(--space-0);
		background: transparent;
		font-size: var(--text-lg);
	}

	.box :global(textarea) {
		border: 0;
		border-radius: var(--space-0);
		background: transparent;
	}

	.line :global(input:focus),
	.box :global(textarea:focus) {
		box-shadow: none;
	}

	.invalid {
		border-color: var(--color-danger);
	}

	.lg .line :global(input) {
		font-size: var(--text-2xl);
		font-style: italic;
	}
</style>
