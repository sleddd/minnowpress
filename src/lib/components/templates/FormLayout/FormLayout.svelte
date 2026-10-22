<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="form-layout">{@render children()}</div>

<style>
	.form-layout {
		display: grid;
		gap: var(--space-7);
		max-width: 40rem;
		margin-inline: auto;
		padding-block: var(--space-5);
	}
</style>
