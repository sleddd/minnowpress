import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
	it('shows a title, message, and action', async () => {
		const screen = await render(EmptyState, {
			title: 'No stories yet',
			message: 'Be the first.',
			action: { href: '/write', label: 'Write one' }
		});
		await expect
			.element(screen.getByRole('heading', { name: 'No stories yet' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Be the first.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Write one' }))
			.toHaveAttribute('href', '/write');
		await expectAccessible(screen.container);
	});

	it('works with just a title', async () => {
		const screen = await render(EmptyState, { title: 'Nothing here' });
		expect(screen.container.querySelector('a')).toBeNull();
		expect(screen.container.querySelector('p')).toBeNull();
	});
});
