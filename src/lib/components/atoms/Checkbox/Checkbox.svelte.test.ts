import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Checkbox from './Checkbox.svelte';

describe('Checkbox', () => {
	it('renders unchecked by default and toggles', async () => {
		const screen = await render(Checkbox, { name: 'isMature', 'aria-label': 'Mature' });
		const box = screen.getByRole('checkbox', { name: 'Mature' });
		await expect.element(box).not.toBeChecked();
		await box.click();
		await expect.element(box).toBeChecked();
	});

	it('can start checked', async () => {
		const screen = await render(Checkbox, { checked: true, 'aria-label': 'Mature' });
		await expect.element(screen.getByRole('checkbox')).toBeChecked();
	});
});
