<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		invalid?: boolean;
		/** Larger serif type for writing stories. */
		prose?: boolean;
		value?: string;
	}

	let {
		invalid = false,
		prose = false,
		rows = 4,
		value = $bindable(''),
		...rest
	}: Props = $props();
</script>

<textarea
	class="textarea"
	class:prose
	{rows}
	aria-invalid={invalid || undefined}
	bind:value
	{...rest}></textarea>

<style>
	.textarea {
		display: block;
		width: 100%;
		padding: var(--space-3);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		line-height: var(--leading-normal);
		resize: vertical;
	}

	.prose {
		padding: var(--space-4);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		line-height: var(--leading-prose);
	}

	.textarea:focus {
		border-color: var(--color-focus);
	}

	.textarea[aria-invalid='true'] {
		border-color: var(--color-danger);
	}
</style>
