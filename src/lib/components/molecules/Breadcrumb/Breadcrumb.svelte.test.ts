import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import Breadcrumb from './Breadcrumb.svelte';

describe('Breadcrumb', () => {
	it('links earlier items and marks the current one', async () => {
		const screen = await render(Breadcrumb, {
			label: 'Story chain',
			items: [
				{ label: 'Duck Hunting', href: '/s/1' },
				{ label: 'Test', href: '/s/2' },
				{ label: '2 sequels' }
			],
			current: 1
		});
		await expect
			.element(screen.getByRole('navigation', { name: 'Story chain' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Duck Hunting' }))
			.toHaveAttribute('href', '/s/1');
		await expect.element(screen.getByText('Test')).toHaveAttribute('aria-current', 'page');
		await expect.element(screen.getByRole('link', { name: 'Test' })).not.toBeInTheDocument();
		await expect.element(screen.getByText('2 sequels')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('renders nothing for a single item', async () => {
		const screen = await render(Breadcrumb, { items: [{ label: 'Alone' }] });
		expect(screen.container.querySelector('nav')).toBeNull();
	});
});
