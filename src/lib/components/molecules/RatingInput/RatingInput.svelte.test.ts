import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import RatingInput from './RatingInput.svelte';

describe('RatingInput', () => {
	it('offers five fish that post a score, showing the current rating', async () => {
		const screen = await render(RatingInput, { storyId: 3, score: 4, signedIn: true });
		const four = screen.getByRole('button', { name: 'Rate 4 out of 5' });
		await expect.element(four).toHaveAttribute('aria-pressed', 'true');
		await expect.element(four).toHaveAttribute('value', '4');
		await expect
			.element(screen.getByRole('button', { name: 'Rate 5 out of 5' }))
			.toHaveAttribute('aria-pressed', 'false');
		expect(screen.container.querySelectorAll('button.on')).toHaveLength(4);
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/s/3?/rate');
		await expectAccessible(screen.container);
	});

	it('shows no fish selected before the reader rates', async () => {
		const screen = await render(RatingInput, { storyId: 3, score: null, signedIn: true });
		expect(screen.container.querySelectorAll('button.on')).toHaveLength(0);
	});

	it('asks signed-out readers to sign in and tells authors they cannot rate', async () => {
		const anon = await render(RatingInput, { storyId: 3, score: null, signedIn: false });
		await expect
			.element(anon.getByRole('link', { name: 'Sign in to rate this story' }))
			.toHaveAttribute('href', '/login?next=/s/3');
		await anon.unmount();
		const author = await render(RatingInput, {
			storyId: 3,
			score: null,
			signedIn: true,
			isAuthor: true
		});
		await expect.element(author.getByText("You can't rate your own story.")).toBeInTheDocument();
		await expect.element(author.getByRole('button')).not.toBeInTheDocument();
	});
});
