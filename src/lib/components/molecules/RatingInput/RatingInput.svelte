<script lang="ts">
	import { enhance } from '$app/forms';
	import { RATING_MAX } from '#lib/rating.ts';
	import { Eyebrow, Link, VisuallyHidden } from '../../atoms/index.ts';

	interface Props {
		storyId: number;
		/** The viewer's current rating, if any. */
		score: number | null;
		signedIn: boolean;
		/** Authors can't rate their own stories. */
		isAuthor?: boolean;
		/** Called with the story's new totals once a rating is saved. */
		onrated?: (totals: { score: number; count: number; average: number | null }) => void;
	}

	let { storyId, score, signedIn, isAuthor = false, onrated }: Props = $props();

	const FISH =
		'M2 7.5 6 12l-4 4.5 1.2.5L7 13.6C9.4 16.5 12.4 18 15.6 18c3.4 0 6-2.3 6.4-6-.4-3.7-3-6-6.4-6C12.4 6 9.4 7.5 7 10.4L3.2 7Zm13.9 2.7a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z';
	const scores = Array.from({ length: RATING_MAX }, (_, i) => i + 1);

	// The fish light up as soon as they're clicked. The server's answer carries the new totals,
	// so the page takes them from there instead of reloading: a reload rebuilds the whole page,
	// throwing away anything half done on it, like a report being filled in. If saving fails,
	// the old rating comes back. Only the latest click counts, so a quick change of mind doesn't
	// flicker back to the first choice.
	let pending = $state<number | null>(null);
	let saved = $derived(score);
	let clicks = 0;
	const shown = $derived(pending ?? saved);
</script>

<div class="rate">
	<Eyebrow tone="muted">Your rating</Eyebrow>
	{#if isAuthor}
		<p class="note">You can't rate your own story.</p>
	{:else if !signedIn}
		<Link href="/login?next=/s/{storyId}">Sign in to rate this story</Link>
	{:else}
		<form
			method="POST"
			action="/s/{storyId}?/rate"
			use:enhance={({ submitter }) => {
				const click = ++clicks;
				pending = Number(submitter?.getAttribute('value')) || null;
				return async ({ result, update }) => {
					if (result.type === 'success' && result.data) {
						const totals = result.data as { score: number; count: number; average: number | null };
						saved = totals.score;
						onrated?.(totals);
					} else await update({ reset: false });
					if (click === clicks) pending = null;
				};
			}}
		>
			{#each scores as value (value)}
				<button
					type="submit"
					name="score"
					{value}
					class:on={shown !== null && value <= shown}
					aria-pressed={shown === value}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={FISH} /></svg>
					<VisuallyHidden>Rate {value} out of {RATING_MAX}</VisuallyHidden>
				</button>
			{/each}
		</form>
	{/if}
</div>

<style>
	.note {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.rate :global(a) {
		font-style: italic;
	}

	.rate {
		display: grid;
		gap: var(--space-2);
	}

	form {
		display: flex;
		gap: var(--space-1);
	}

	button {
		display: grid;
		place-items: center;
		width: var(--size-avatar-md);
		height: var(--size-avatar-md);
		padding: var(--space-0);
		border: 0;
		background: var(--color-surface-sunken);
		color: var(--color-accent);
		cursor: pointer;
	}

	svg {
		width: var(--size-avatar-sm);
		height: var(--size-avatar-sm);
		fill: currentcolor;
		fill-rule: evenodd;
		opacity: 0.35;
	}

	.on svg {
		opacity: 1;
	}

	button:hover svg {
		opacity: 1;
	}

	form:hover button:hover ~ button svg {
		opacity: 0.35;
	}
</style>
