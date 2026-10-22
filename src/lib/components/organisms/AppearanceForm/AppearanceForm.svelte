<script lang="ts">
	import type { Theme } from '#lib/theme.ts';
	import { Button, Heading, Notice } from '../../atoms/index.ts';

	interface Props {
		theme: Theme;
		saved?: boolean;
	}

	let { theme, saved = false }: Props = $props();

	const options: { value: Theme; label: string; hint: string }[] = [
		{ value: 'light', label: 'Light', hint: 'The default' },
		{ value: 'auto', label: 'Auto', hint: 'Match this device’s setting' },
		{ value: 'dark', label: 'Dark', hint: 'Always dark' }
	];
</script>

<!-- Not enhanced: a full reload re-renders the page in the new theme. -->
<form class="form" method="POST" action="?/theme">
	<Heading level={2} size="md">Appearance</Heading>
	{#if saved}<Notice tone="success">Theme saved.</Notice>{/if}
	<fieldset>
		<legend>Theme</legend>
		{#each options as option (option.value)}
			<label class="option">
				<input type="radio" name="theme" value={option.value} checked={theme === option.value} />
				<span><strong>{option.label}</strong> <span class="hint">{option.hint}</span></span>
			</label>
		{/each}
	</fieldset>
	<div><Button type="submit" variant="secondary">Save theme</Button></div>
</form>

<style>
	.form,
	fieldset {
		display: grid;
		gap: var(--space-3);
	}

	fieldset {
		padding: var(--space-0);
		border: 0;
	}

	legend {
		margin-bottom: var(--space-2);
		font-weight: var(--weight-semibold);
	}

	.option {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	input {
		accent-color: var(--color-accent);
	}
</style>
