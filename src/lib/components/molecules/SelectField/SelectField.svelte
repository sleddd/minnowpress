<script lang="ts">
	import { FieldError, Label, Select } from '../../atoms/index.ts';

	interface Props {
		id: string;
		name: string;
		label: string;
		options: { value: string; label: string }[];
		value?: string;
		error?: string | null;
	}

	let {
		id,
		name,
		label,
		options,
		value = $bindable(options[0]?.value ?? ''),
		error
	}: Props = $props();
</script>

<div class="field">
	<Label for={id}>{label}</Label>
	<Select
		{id}
		{name}
		{options}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
	/>
	<FieldError id="{id}-error" message={error} />
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-1);
	}
</style>
