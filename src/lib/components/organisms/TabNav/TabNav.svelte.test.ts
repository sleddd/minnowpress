import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import TabNav from './TabNav.svelte';

describe('TabNav', () => {
	it('renders tabs and marks the current one', async () => {
		const screen = await render(TabNav, {
			label: 'Feeds',
			tabs: [
				{ href: '/', label: 'Latest', current: true },
				{ href: '/?tab=active', label: 'Active', current: false }
			]
		});
		await expect.element(screen.getByRole('navigation', { name: 'Feeds' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Latest' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(screen.getByRole('link', { name: 'Active' }))
			.not.toHaveAttribute('aria-current');
		await expectAccessible(screen.container);
	});
});
