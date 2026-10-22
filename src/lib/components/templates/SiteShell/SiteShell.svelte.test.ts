import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import { text } from '../../testing/helpers';
import SiteShell from './SiteShell.svelte';

const html = (s: string) => createRawSnippet(() => ({ render: () => s }));

describe('SiteShell', () => {
	it('puts the masthead and banner on the frame and the ribbon and content in the card', async () => {
		const screen = await render(SiteShell, {
			masthead: html('<header>Logo</header>'),
			banner: html('<p>Every story</p>'),
			ribbon: html('<nav aria-label="Main">Ribbon</nav>'),
			footer: html('<footer>Foot</footer>'),
			children: text('Body')
		});
		await expect.element(screen.getByRole('banner')).toHaveTextContent('Logo');
		await expect.element(screen.getByText('Every story')).toBeInTheDocument();
		const card = screen.container.querySelector('.card')!;
		expect(card.querySelector('nav')?.textContent).toBe('Ribbon');
		expect(card.querySelector('main')?.textContent).toBe('Body');
		await expect.element(screen.getByRole('contentinfo')).toHaveTextContent('Foot');
		await expect
			.element(screen.getByRole('link', { name: 'Skip to content' }))
			.toHaveAttribute('href', '#main');
	});

	it('omits the banner when not given', async () => {
		const screen = await render(SiteShell, {
			masthead: html('<header>Logo</header>'),
			ribbon: html('<nav>Ribbon</nav>'),
			footer: html('<footer>Foot</footer>'),
			children: text('Body')
		});
		expect(screen.container.querySelector('.banner')).toBeNull();
	});
});
