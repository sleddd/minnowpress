import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RatingFish from './RatingFish.svelte';

describe('RatingFish', () => {
	it('fills fish for the rounded average and labels the value', async () => {
		const screen = await render(RatingFish, { value: 4.4 });
		await expect
			.element(screen.getByRole('img', { name: 'Rated 4.4 out of 5' }))
			.toBeInTheDocument();
		expect(screen.container.querySelectorAll('.on')).toHaveLength(4);
		expect(screen.container.querySelectorAll('svg')).toHaveLength(5);
	});

	it('shows empty fish when unrated, in the small size', async () => {
		const screen = await render(RatingFish, { value: null, size: 'sm' });
		await expect.element(screen.getByRole('img', { name: 'Not rated yet' })).toBeInTheDocument();
		expect(screen.container.querySelectorAll('.on')).toHaveLength(0);
		expect(screen.container.querySelector('.fish.sm')).not.toBeNull();
	});
});
