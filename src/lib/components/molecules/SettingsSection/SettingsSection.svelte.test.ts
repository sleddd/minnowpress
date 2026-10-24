import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible, text } from '../../testing/helpers';
import SettingsSection from './SettingsSection.svelte';

describe('SettingsSection', () => {
	it('is a region named by its heading, with a description beside the fields', async () => {
		const screen = await render(SettingsSection, {
			id: 'email',
			title: 'Email',
			description: 'What we write to you about.',
			children: text('Fields here')
		});
		const section = screen.getByRole('region', { name: 'Email' });
		await expect.element(section).toHaveAttribute('id', 'email');
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Email' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('What we write to you about.')).toBeInTheDocument();
		await expect.element(screen.getByText('Fields here')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('can leave out the description', async () => {
		const screen = await render(SettingsSection, {
			id: 'x',
			title: 'X',
			children: text('y')
		});
		expect(screen.container.querySelector('.about p')).toBeNull();
	});
});
