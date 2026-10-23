<script lang="ts">
	import { Button, FieldError, Icon } from '../../atoms/index.ts';

	interface Props {
		label: string;
		/** Runs the passkey ceremony; resolves to an error message, or null on success. */
		run: () => Promise<string | null>;
		variant?: 'primary' | 'secondary';
		id?: string;
		/** The key icon before the label; off where the button speaks for itself. */
		icon?: boolean;
	}

	let { label, run, variant = 'secondary', id = 'passkey', icon = true }: Props = $props();

	let busy = $state(false);
	let error = $state<string | null>(null);

	async function onclick() {
		busy = true;
		error = null;
		error = await run();
		busy = false;
	}
</script>

<div class="passkey">
	<Button {variant} {onclick} disabled={busy} aria-describedby={error ? `${id}-error` : undefined}>
		{#if icon}<Icon name="key" />{/if}
		{busy ? 'Waiting for your passkey…' : label}
	</Button>
	<FieldError id="{id}-error" message={error} />
</div>

<style>
	.passkey {
		display: grid;
		justify-items: start;
		gap: var(--space-1);
	}
</style>
