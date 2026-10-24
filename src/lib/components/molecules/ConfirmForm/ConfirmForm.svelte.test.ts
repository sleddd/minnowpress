import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ConfirmForm from './ConfirmForm.svelte';

describe('ConfirmForm', () => {
	it('opens to a message and a button that posts the action', async () => {
		const screen = await render(ConfirmForm, {
			label: 'Remove challenge (moderator)',
			message: 'It disappears from the site.',
			action: '?/remove',
			confirm: 'Remove challenge'
		});
		const details = screen.container.querySelector('details')!;
		expect(details.open).toBe(false);
		await screen.getByText('Remove challenge (moderator)').click();
		expect(details.open).toBe(true);
		await expect.element(screen.getByRole('button', { name: 'Remove challenge' })).toBeVisible();
		await expect.element(screen.getByText('It disappears from the site.')).toBeVisible();
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('?/remove');
		await expectAccessible(screen.container);
	});
});
