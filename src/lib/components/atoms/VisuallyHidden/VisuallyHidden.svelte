<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<span class="visually-hidden">{@render children()}</span>

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		/* stylelint-disable-next-line scale-unlimited/declaration-strict-value -- standard visually-hidden technique */
		margin: -1px;
		padding: var(--space-0);
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
</style>
