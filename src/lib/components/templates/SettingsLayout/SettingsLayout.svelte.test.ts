import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import SettingsLayout from './SettingsLayout.svelte';

describe('SettingsLayout', () => {
	it('heads the page and renders its sections', async () => {
		const screen = await render(SettingsLayout, {
			title: 'Your profile',
			children: text('Sections')
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Your profile' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Sections')).toBeInTheDocument();
	});
});
