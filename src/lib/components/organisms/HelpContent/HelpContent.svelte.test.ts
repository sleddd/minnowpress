import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import HelpContent from './HelpContent.svelte';

describe('HelpContent', () => {
	it('answers common questions', async () => {
		const screen = await render(HelpContent, { appName: 'MinnowPress' });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Help' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { name: 'How do ratings work?' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/Between 60 and 1,024 characters/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'suggest one' }))
			.toHaveAttribute('href', '/challenges/new');
		await expectAccessible(screen.container);
	});
});
