import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BookmarkButton from './BookmarkButton.svelte';

describe('BookmarkButton', () => {
	it('posts to the bookmark action and shows state', async () => {
		const screen = await render(BookmarkButton, { storyId: 3, bookmarked: false, signedIn: true });
		const button = screen.getByRole('button', { name: 'Save' });
		await expect.element(button).toHaveAttribute('aria-pressed', 'false');
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/s/3?/bookmark');
		await expectAccessible(screen.container);
	});

	it('shows saved stories as pressed', async () => {
		const screen = await render(BookmarkButton, { storyId: 3, bookmarked: true, signedIn: true });
		await expect
			.element(screen.getByRole('button', { name: 'Saved' }))
			.toHaveAttribute('aria-pressed', 'true');
	});

	it('links to sign in when signed out', async () => {
		const screen = await render(BookmarkButton, { storyId: 3, bookmarked: false, signedIn: false });
		await expect
			.element(screen.getByRole('link', { name: 'Save' }))
			.toHaveAttribute('href', '/login?next=/s/3');
	});
});
