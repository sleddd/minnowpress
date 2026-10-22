<script lang="ts">
	import { filledFish, RATING_MAX } from '#lib/rating.ts';

	const FISH =
		'M2 7.5 6 12l-4 4.5 1.2.5L7 13.6C9.4 16.5 12.4 18 15.6 18c3.4 0 6-2.3 6.4-6-.4-3.7-3-6-6.4-6C12.4 6 9.4 7.5 7 10.4L3.2 7Zm13.9 2.7a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z';

	interface Props {
		/** Average rating, or null when unrated. */
		value: number | null;
		size?: 'sm' | 'md';
	}

	let { value, size = 'md' }: Props = $props();

	const filled = $derived(filledFish(value));
	const label = $derived(value === null ? 'Not rated yet' : `Rated ${value} out of ${RATING_MAX}`);
</script>

<span class="fish {size}" role="img" aria-label={label}>
	{#each Array.from({ length: RATING_MAX }, (_, i) => i) as i (i)}
		<svg class:on={i < filled} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
			><path d={FISH} /></svg
		>
	{/each}
</span>

<style>
	.fish {
		display: inline-flex;
		gap: var(--space-1);
		color: var(--color-accent);
	}

	svg {
		width: var(--size-icon);
		height: var(--size-icon);
		fill: currentcolor;
		fill-rule: evenodd;
		opacity: 0.25;
	}

	.on {
		opacity: 1;
	}

	.md svg {
		width: var(--size-avatar-sm);
		height: var(--size-avatar-sm);
	}
</style>
