<script lang="ts">
	import { Checkbox, Label, Text } from '../../atoms/index.ts';

	interface Props {
		id: string;
		name: string;
		label: string;
		hint?: string;
		checked?: boolean;
	}

	let { id, name, label, hint, checked = $bindable(false) }: Props = $props();
</script>

<div class="field">
	<Checkbox {id} {name} bind:checked aria-describedby={hint ? `${id}-hint` : undefined} />
	<div>
		<Label for={id}>{label}</Label>
		{#if hint}<span id="{id}-hint"><Text as="span" tone="muted" size="sm">{hint}</Text></span>{/if}
	</div>
</div>

<style>
	.field {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}
</style>
