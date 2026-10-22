<script lang="ts">
	interface Props {
		size?: 'sm' | 'md';
		shape?: 'square' | 'round';
	}

	let { size = 'md', shape = 'square' }: Props = $props();
</script>

<span class="thumb {size} {shape}" aria-hidden="true"></span>

<style>
	.thumb {
		display: block;
		flex: none;
		/* stylelint-disable-next-line scale-unlimited/declaration-strict-value -- gradient built from tokens */
		background: repeating-linear-gradient(
			135deg,
			var(--color-stripe-a) 0 var(--space-2),
			var(--color-stripe-b) var(--space-2) var(--space-4)
		);
	}

	.sm {
		width: var(--size-thumb-sm);
		height: var(--size-thumb-sm);
	}

	.md {
		width: var(--size-thumb-md);
		height: var(--size-thumb-md);
	}

	.round {
		border-radius: var(--radius-full);
	}
</style>
