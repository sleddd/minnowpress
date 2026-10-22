import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import AppearanceForm from './AppearanceForm.svelte';

describe('AppearanceForm', () => {
	it('lets the member pick auto, light, or dark', async () => {
		const screen = await render(AppearanceForm, { theme: 'dark' });
		await expect.element(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
		await expect.element(screen.getByRole('radio', { name: /Dark/ })).toBeChecked();
		await expect.element(screen.getByRole('radio', { name: /Auto/ })).not.toBeChecked();
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('action')).toBe('?/theme');
		expect(new FormData(form).get('theme')).toBe('dark');
		await expectAccessible(screen.container);
	});

	it('confirms when saved', async () => {
		const screen = await render(AppearanceForm, { theme: 'auto', saved: true });
		await expect.element(screen.getByText('Theme saved.')).toBeInTheDocument();
	});
});
