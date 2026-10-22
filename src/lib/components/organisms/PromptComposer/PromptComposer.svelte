<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Heading, Notice, Text } from '../../atoms/index.ts';
	import { FormField } from '../../molecules/index.ts';

	interface Props {
		/** False when Bedrock credentials are not configured. */
		canGenerate: boolean;
		errors?: Partial<Record<'title' | 'promptText' | 'generate', string>>;
		generated?: number | null;
	}

	let { canGenerate, errors = {}, generated = null }: Props = $props();
</script>

<section class="composer" aria-labelledby="composer-title">
	<Heading level={2} size="md" id="composer-title">Add prompts</Heading>

	<div class="block">
		<Text tone="muted" size="sm">
			AI suggests writing prompts only. It never writes stories. Prompts here wait for your
			approval; if nothing approved is waiting when a challenge ends, the daily job starts a fresh
			AI prompt.
		</Text>
		{#if generated !== null}<Notice tone="success">Added {generated} prompts for review.</Notice
			>{/if}
		{#if errors.generate}<Notice tone="error">{errors.generate}</Notice>{/if}
		<form method="POST" action="?/generate" use:enhance>
			<Button type="submit" variant="secondary" disabled={!canGenerate}>Suggest prompts now</Button>
		</form>
		{#if !canGenerate}<Text tone="muted" size="sm"
				>Set the BEDROCK_AWS_* variables to enable suggestions.</Text
			>{/if}
	</div>

	<form class="block" method="POST" action="?/create" use:enhance>
		<FormField
			id="new-title"
			name="title"
			label="Title"
			error={errors.title}
			maxlength={100}
			required
		/>
		<FormField
			id="new-prompt"
			name="promptText"
			label="Prompt"
			type="textarea"
			rows={3}
			error={errors.promptText}
			maxlength={500}
			required
		/>
		<div><Button type="submit">Add prompt</Button></div>
	</form>
</section>

<style>
	.composer,
	.block {
		display: grid;
		gap: var(--space-3);
	}

	.composer {
		gap: var(--space-5);
	}
</style>
