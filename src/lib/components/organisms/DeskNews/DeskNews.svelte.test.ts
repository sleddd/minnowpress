import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import DeskNews from './DeskNews.svelte';

describe('DeskNews', () => {
	it('shows the latest blog post', async () => {
		const screen = await render(DeskNews, {
			appName: 'MinnowPress',
			post: {
				slug: 'hello',
				title: 'Hello again',
				body: 'We are back.',
				publishedAt: new Date('2026-10-01T12:00:00Z')
			}
		});
		await expect
			.element(screen.getByRole('heading', { name: 'MinnowPress News' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Hello again' }))
			.toHaveAttribute('href', '/blog/hello');
		await expect.element(screen.getByText('We are back.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'More news' }))
			.toHaveAttribute('href', '/blog');
		await expectAccessible(screen.container);
	});

	it('says when there is no news', async () => {
		const screen = await render(DeskNews, { appName: 'M', post: null });
		await expect.element(screen.getByText(/No news yet/)).toBeInTheDocument();
	});
});
