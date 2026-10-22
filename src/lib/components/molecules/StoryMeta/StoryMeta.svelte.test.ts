import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryMeta from './StoryMeta.svelte';

const author = { username: 'jane', displayName: 'Jane Doe', avatarUrl: null };

describe('StoryMeta', () => {
	it('links to the author and shows the time', async () => {
		const screen = await render(StoryMeta, { author, date: new Date() });
		await expect
			.element(screen.getByRole('link', { name: 'Jane Doe' }))
			.toHaveAttribute('href', '/@jane');
		expect(screen.container.querySelector('time')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('omits the time when there is no date', async () => {
		const screen = await render(StoryMeta, { author, date: null, size: 'md' });
		expect(screen.container.querySelector('time')).toBeNull();
		expect(screen.container.querySelector('.avatar.md')).not.toBeNull();
	});

	it('updates when the author changes', async () => {
		const screen = await render(StoryMeta, { author, date: null });
		await screen.rerender({ author: { username: 'bob', displayName: 'Bob', avatarUrl: null } });
		await expect
			.element(screen.getByRole('link', { name: 'Bob' }))
			.toHaveAttribute('href', '/@bob');
	});
});
