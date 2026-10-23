import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import DeskStories from './DeskStories.svelte';

const at = new Date('2026-10-22T12:00:00Z');

describe('DeskStories', () => {
	it('lists the member’s drafts and published stories', async () => {
		const screen = await render(DeskStories, {
			username: 'theminnow',
			stories: [
				{ id: 2, title: 'Half done', draft: true, at },
				{ id: 1, title: 'The Lighthouse', draft: false, at }
			]
		});
		await expect
			.element(screen.getByRole('heading', { name: 'Your latest stories' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Half done' }))
			.toHaveAttribute('href', '/s/2');
		await expect.element(screen.getByText('Draft', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText(/started Oct 22/)).toBeInTheDocument();
		await expect.element(screen.getByText(/Published\s+Oct 22/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'All your stories' }))
			.toHaveAttribute('href', '/@theminnow');
		await expectAccessible(screen.container);
	});

	it('points a new member at the editor', async () => {
		const screen = await render(DeskStories, { username: 'theminnow', stories: [] });
		await expect
			.element(screen.getByRole('link', { name: 'Write your first story.' }))
			.toHaveAttribute('href', '/write');
		await expect
			.element(screen.getByRole('link', { name: 'All your stories' }))
			.not.toBeInTheDocument();
	});
});
