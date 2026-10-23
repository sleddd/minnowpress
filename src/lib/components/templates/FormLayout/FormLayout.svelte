<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** narrow: one column of fields · wide: room for two side by side (sign in) */
		width?: 'narrow' | 'wide';
		children: Snippet;
	}

	let { width = 'narrow', children }: Props = $props();
</script>

<div class="form-layout {width}">{@render children()}</div>

<style>
	.form-layout {
		display: grid;
		gap: var(--space-7);
		max-width: 40rem;
		margin-inline: auto;
		padding-block: var(--space-5);
	}

	.wide {
		max-width: 64rem;
	}
</style>
