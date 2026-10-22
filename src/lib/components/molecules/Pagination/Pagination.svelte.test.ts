import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import Pagination from './Pagination.svelte';

describe('Pagination', () => {
	it('renders nothing for a single page', async () => {
		const screen = await render(Pagination, { page: 1, hasMore: false, url: new URL('http://x/') });
		expect(screen.container.querySelector('nav')).toBeNull();
	});

	it('links to the next page, keeping other params', async () => {
		const screen = await render(Pagination, {
			page: 1,
			hasMore: true,
			url: new URL('http://x/?tab=active')
		});
		await expect
			.element(screen.getByRole('link', { name: 'Older' }))
			.toHaveAttribute('href', '/?tab=active&page=2');
		await expect.element(screen.getByRole('link', { name: 'Newer' })).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('links back, dropping page=1', async () => {
		const screen = await render(Pagination, {
			page: 2,
			hasMore: false,
			url: new URL('http://x/tags/sea?page=2')
		});
		await expect
			.element(screen.getByRole('link', { name: 'Newer' }))
			.toHaveAttribute('href', '/tags/sea');
		await expect.element(screen.getByRole('link', { name: 'Older' })).not.toBeInTheDocument();
	});
});
