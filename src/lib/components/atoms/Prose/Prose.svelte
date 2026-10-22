<script lang="ts">
	import { splitParagraphs } from '#lib/paragraphs.ts';

	interface Props {
		/** Plain text exactly as the author wrote it. Never rendered as HTML. */
		text: string;
		size?: 'md' | 'lg';
	}

	let { text, size = 'lg' }: Props = $props();

	// Spacing as the author wrote it: each blank line between paragraphs is one empty line.
	const paragraphs = $derived(splitParagraphs(text));
</script>

<div class="prose {size}">
	{#each paragraphs as paragraph, i (i)}<p class="gap-{paragraph.gap}">{paragraph.text}</p>{/each}
</div>

<style>
	.prose {
		max-width: var(--measure);
		font-family: var(--font-serif);
		line-height: var(--leading-prose);
		overflow-wrap: break-word;
	}

	p {
		white-space: pre-wrap;
	}

	/* One line of space per blank line the author left. */
	.gap-1 {
		margin-top: var(--space-paragraph);
	}

	.gap-2 {
		--gap: calc(var(--space-paragraph) * 2);

		margin-top: var(--gap);
	}

	.gap-3 {
		--gap: calc(var(--space-paragraph) * 3);

		margin-top: var(--gap);
	}

	.md {
		font-size: var(--text-md);
	}

	.lg {
		font-size: var(--text-lg);
	}
</style>
