import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import SiteFooter from './SiteFooter.svelte';

describe('SiteFooter', () => {
	it('shows the license, the human-only note, and section links', async () => {
		const screen = await render(SiteFooter, {});
		await expect
			.element(screen.getByRole('link', { name: 'CC BY-SA' }))
			.toHaveAttribute('rel', 'license noopener');
		await expect.element(screen.getByText(/Written by people, not machines/)).toBeInTheDocument();
		const nav = screen.getByRole('navigation', { name: 'Footer' });
		for (const [label, href] of [
			['About', '/about'],
			['Authors', '/authors'],
			['Stories', '/stories'],
			['Challenges', '/challenges'],
			['Tags', '/tags'],
			['Help', '/help']
		])
			await expect.element(nav.getByRole('link', { name: label })).toHaveAttribute('href', href);
		await expectAccessible(screen.container);
	});
});
