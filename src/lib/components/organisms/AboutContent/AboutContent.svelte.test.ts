import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import AboutContent from './AboutContent.svelte';

describe('AboutContent', () => {
	it('explains the site, the no-AI rule, its history, and the license', async () => {
		const screen = await render(AboutContent, { appName: 'MinnowPress' });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'About MinnowPress' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/1,024 characters or less/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { name: 'Written by people' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Ficlets' }))
			.toHaveAttribute('href', 'https://ficlets.com');
		await expect
			.element(screen.getByRole('link', { name: 'Ficly' }))
			.toHaveAttribute('href', 'https://ficly.com');
		await expect.element(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});
});
