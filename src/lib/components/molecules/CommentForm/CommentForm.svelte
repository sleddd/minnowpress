<script lang="ts">
	import { enhance } from '$app/forms';
	import { COMMENT_MAX, countGraphemes } from '#lib/text.ts';
	import {
		Button,
		CharCount,
		FieldError,
		Label,
		TextArea,
		VisuallyHidden
	} from '../../atoms/index.ts';

	interface Props {
		action: string;
		error?: string | null;
		value?: string;
	}

	let { action, error, value = $bindable('') }: Props = $props();

	const count = $derived(countGraphemes(value));
</script>

<form
	class="comment-form"
	method="POST"
	{action}
	use:enhance={() =>
		async ({ result, update }) => {
			await update({ reset: result.type === 'success' });
			if (result.type === 'success') value = '';
		}}
>
	<VisuallyHidden><Label for="comment-body">Add a comment</Label></VisuallyHidden>
	<TextArea
		id="comment-body"
		name="body"
		rows={4}
		placeholder="Add a comment"
		bind:value
		invalid={Boolean(error) || count > COMMENT_MAX}
		aria-describedby="comment-count{error ? ' comment-error' : ''}"
	/>
	<FieldError id="comment-error" message={error} />
	<div class="row">
		<CharCount id="comment-count" {count} max={COMMENT_MAX} />
		<Button type="submit" size="sm" disabled={count === 0 || count > COMMENT_MAX}>Comment</Button>
	</div>
</form>

<style>
	.comment-form {
		display: grid;
		gap: var(--space-2);
	}

	.comment-form :global(textarea) {
		padding: var(--space-4) var(--space-5);
		border: var(--border-width) dashed var(--color-border-strong);
		border-radius: var(--space-0);
		background: var(--color-surface);
	}

	.comment-form :global(textarea:focus) {
		border-color: var(--color-accent);
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
