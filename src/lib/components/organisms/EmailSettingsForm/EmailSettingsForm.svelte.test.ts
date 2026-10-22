import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import EmailSettingsForm from './EmailSettingsForm.svelte';

const prefs = { notifyComments: true, notifyContinuations: false, notifyDigest: true };

describe('EmailSettingsForm', () => {
	it('shows each preference and posts to the notifications action', async () => {
		const screen = await render(EmailSettingsForm, { prefs });
		await expect
			.element(screen.getByRole('checkbox', { name: /comments on my story/ }))
			.toBeChecked();
		await expect
			.element(screen.getByRole('checkbox', { name: /prequel or sequel/ }))
			.not.toBeChecked();
		await expect.element(screen.getByRole('checkbox', { name: /Weekly digest/ })).toBeChecked();
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('action')).toBe('?/notifications');
		expect(new FormData(form).get('notifyComments')).toBe('on');
		expect(new FormData(form).get('notifyContinuations')).toBeNull();
		await expectAccessible(screen.container);
	});

	it('confirms a save', async () => {
		const screen = await render(EmailSettingsForm, { prefs, saved: true });
		await expect.element(screen.getByText('Email settings saved.')).toBeInTheDocument();
	});
});
