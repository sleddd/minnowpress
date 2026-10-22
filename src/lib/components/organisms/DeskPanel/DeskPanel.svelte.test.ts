import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import DeskPanel from './DeskPanel.svelte';

describe('DeskPanel', () => {
	it('links to the member’s tools and library with counts', async () => {
		const screen = await render(DeskPanel, {
			username: 'thx',
			counts: { drafts: 2, published: 14 }
		});
		const desk = screen.getByRole('navigation', { name: 'Your Desk' });
		await expect
			.element(desk.getByRole('link', { name: 'Edit your profile' }))
			.toHaveAttribute('href', '/settings');
		await expect
			.element(desk.getByRole('link', { name: 'Write a new story' }))
			.toHaveAttribute('href', '/write');
		await expect
			.element(desk.getByRole('link', { name: 'Create a new challenge' }))
			.toHaveAttribute('href', '/challenges/new');
		await expect
			.element(desk.getByRole('link', { name: 'Drafts (2)' }))
			.toHaveAttribute('href', '/@thx#drafts');
		await expect
			.element(desk.getByRole('link', { name: 'Published stories (14)' }))
			.toHaveAttribute('href', '/@thx');
		await expectAccessible(screen.container);
	});
});
