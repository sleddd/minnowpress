<script lang="ts">
	import { enhance } from '$app/forms';
	import { toDateInput } from '#lib/format.ts';
	import type { PendingPromptView } from '#lib/types.ts';
	import { Badge, Button, Heading, Notice, Timestamp } from '../../atoms/index.ts';
	import { EmptyState, FormField } from '../../molecules/index.ts';

	interface Props {
		prompts: PendingPromptView[];
		/** Default start date for the next approval. */
		suggestedStart: Date;
		error?: { id: number; message: string } | null;
	}

	let { prompts, suggestedStart, error = null }: Props = $props();
</script>

<section class="review" aria-labelledby="review-title">
	<Heading level={2} size="md" id="review-title">Waiting for review</Heading>
	{#if prompts.length === 0}
		<EmptyState title="No prompts waiting" message="Generate a batch or write one yourself." />
	{:else}
		<ol class="list" role="list">
			{#each prompts as prompt (prompt.id)}
				<li class="item">
					<form class="form" method="POST" action="?/approve" use:enhance>
						<div class="head">
							<Badge tone={prompt.source === 'ai' ? 'neutral' : 'accent'}
								>{prompt.source === 'ai' ? 'AI-suggested' : 'Human'}</Badge
							>
							<Timestamp date={prompt.createdAt} />
						</div>
						{#if error?.id === prompt.id}<Notice tone="error">{error.message}</Notice>{/if}
						<input type="hidden" name="id" value={prompt.id} />
						<FormField
							id="title-{prompt.id}"
							name="title"
							label="Title"
							value={prompt.title}
							maxlength={100}
							required
						/>
						<FormField
							id="prompt-{prompt.id}"
							name="promptText"
							label="Prompt"
							type="textarea"
							rows={3}
							value={prompt.promptText}
							maxlength={500}
							required
						/>
						<FormField
							id="starts-{prompt.id}"
							name="startsAt"
							label="Starts"
							type="date"
							value={toDateInput(suggestedStart)}
							hint="Runs 14 days. The default is right after the last scheduled challenge."
							required
						/>
						<div class="actions">
							<Button type="submit" size="sm">Approve &amp; schedule</Button>
							<Button type="submit" formaction="?/reject" variant="ghost" size="sm" formnovalidate
								>Reject</Button
							>
						</div>
					</form>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.review,
	.list {
		display: grid;
		gap: var(--space-4);
	}

	.item {
		padding: var(--space-4);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.form {
		display: grid;
		gap: var(--space-3);
	}

	.head,
	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
</style>
