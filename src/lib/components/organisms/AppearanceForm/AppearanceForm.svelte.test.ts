import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import AppearanceForm from './AppearanceForm.svelte';

describe('AppearanceForm', () => {
	it('offers a sun for each theme that saves it, marking the current one', async () => {
		const screen = await render(AppearanceForm, { theme: 'dark' });
		await expect.element(screen.getByRole('heading', { name: 'Appearance' })).toBeInTheDocument();
		const dark = screen.getByRole('button', { name: 'Dark theme' });
		await expect.element(dark).toHaveAttribute('aria-pressed', 'true');
		await expect.element(dark).toHaveAttribute('value', 'dark');
		await expect.element(dark).toHaveAttribute('type', 'submit');
		await expect
			.element(screen.getByRole('button', { name: 'Light theme' }))
			.toHaveAttribute('aria-pressed', 'false');
		await expect
			.element(screen.getByRole('button', { name: /Auto theme/ }))
			.toHaveAttribute('aria-pressed', 'false');
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('?/theme');
		// Outline for light, filled for dark, half of each for auto.
		const fills = (value: string) =>
			screen.container.querySelectorAll(`button[value="${value}"] .fill`).length;
		expect([fills('light'), fills('dark'), fills('auto')]).toEqual([0, 1, 1]);
		await expectAccessible(screen.container);
	});

	it('confirms when saved', async () => {
		const screen = await render(AppearanceForm, { theme: 'auto', saved: true });
		await expect.element(screen.getByText('Theme saved.')).toBeInTheDocument();
	});
});
