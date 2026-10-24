<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Heading, Text } from '../../atoms/index.ts';

	interface Props {
		/** Used for the heading's id, so the section is named by its heading. */
		id: string;
		title: string;
		description?: string;
		children: Snippet;
	}

	let { id, title, description, children }: Props = $props();
</script>

<!-- One group of settings: what it is on the left, its fields on the right. -->
<section class="section" {id} aria-labelledby="{id}-title">
	<div class="about">
		<Heading level={2} size="lg" id="{id}-title">{title}</Heading>
		{#if description}<Text tone="muted">{description}</Text>{/if}
	</div>
	<div class="fields">{@render children()}</div>
</section>

<style>
	.section {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) minmax(0, 2.25fr);
		gap: var(--space-5) var(--space-8);
		padding-block: var(--space-7);
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.about {
		display: grid;
		align-content: start;
		gap: var(--space-3);
	}

	.fields {
		display: grid;
		align-content: start;
		gap: var(--space-5);
		max-width: 52rem;
	}

	@media (width < 48rem) {
		.section {
			grid-template-columns: minmax(0, 1fr);
			padding-block: var(--space-6);
		}
	}
</style>
