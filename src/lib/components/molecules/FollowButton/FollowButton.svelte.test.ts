import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import FollowButton from './FollowButton.svelte';

describe('FollowButton', () => {
	it('follows when not yet following', async () => {
		const screen = await render(FollowButton, {
			username: 'jane',
			following: false,
			signedIn: true
		});
		await expect.element(screen.getByRole('button', { name: 'Follow' })).toHaveClass('primary');
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/@jane?/follow');
		await expectAccessible(screen.container);
	});

	it('unfollows when following', async () => {
		const screen = await render(FollowButton, {
			username: 'jane',
			following: true,
			signedIn: true
		});
		await expect
			.element(screen.getByRole('button', { name: 'Following' }))
			.toHaveClass('secondary');
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/@jane?/unfollow');
	});

	it('links to sign in when signed out', async () => {
		const screen = await render(FollowButton, {
			username: 'jane',
			following: false,
			signedIn: false
		});
		await expect
			.element(screen.getByRole('link', { name: 'Follow' }))
			.toHaveAttribute('href', '/login?next=/@jane');
	});
});
