<script lang="ts">
	import { Button, Heading, Notice, Text } from '../../atoms/index.ts';
	import { BlockField, FormField } from '../../molecules/index.ts';

	interface Props {
		values?: { title: string; promptText: string };
		errors?: Partial<Record<'title' | 'promptText' | 'form', string>>;
		/** Set after a successful proposal. */
		proposed?: boolean;
	}

	let { values = { title: '', promptText: '' }, errors = {}, proposed = false }: Props = $props();
</script>

<section class="propose" aria-labelledby="propose-title">
	<Heading level={1} size="xl" id="propose-title">Create a new challenge</Heading>
	<Text tone="muted">
		Suggest a prompt for everyone to write to. Someone from the team reviews each one, then it takes
		its turn: one challenge runs at a time, for 14 days.
	</Text>

	{#if proposed}<Notice tone="success">Thanks! Your challenge is waiting for review.</Notice>{/if}
	{#if errors.form}<Notice tone="error">{errors.form}</Notice>{/if}

	<form method="POST">
		<BlockField
			id="title"
			name="title"
			label="Title"
			value={values.title}
			error={errors.title}
			required
			maxlength={100}
		/>
		<FormField
			id="promptText"
			name="promptText"
			label="The challenge"
			type="textarea"
			rows={4}
			value={values.promptText}
			error={errors.promptText}
			hint="What should people write about? 500 characters or less."
			maxlength={500}
			required
		/>
		<div><Button type="submit">suggest it!</Button></div>
	</form>
</section>

<style>
	.propose,
	form {
		display: grid;
		gap: var(--space-5);
	}
</style>
