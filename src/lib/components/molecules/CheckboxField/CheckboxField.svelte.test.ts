import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import CheckboxField from './CheckboxField.svelte';

describe('CheckboxField', () => {
	it('labels the checkbox and describes it with the hint', async () => {
		const screen = await render(CheckboxField, {
			id: 'mature',
			name: 'isMature',
			label: 'Mature content',
			hint: 'Hidden unless readers opt in.'
		});
		const box = screen.getByRole('checkbox', { name: 'Mature content' });
		await expect.element(box).toHaveAttribute('aria-describedby', 'mature-hint');
		await expect.element(box).not.toBeChecked();
		await screen.getByText('Mature content').click();
		await expect.element(box).toBeChecked();
		await expectAccessible(screen.container);
	});

	it('can start checked without a hint', async () => {
		const screen = await render(CheckboxField, { id: 'm', name: 'm', label: 'M', checked: true });
		const box = screen.getByRole('checkbox');
		await expect.element(box).toBeChecked();
		await expect.element(box).not.toHaveAttribute('aria-describedby');
	});
});
