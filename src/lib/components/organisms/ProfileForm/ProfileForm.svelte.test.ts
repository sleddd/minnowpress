import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ProfileForm from './ProfileForm.svelte';

const values = { username: 'jane', displayName: 'Jane', bio: 'Hi', website: '', showMature: true };

describe('ProfileForm', () => {
	it('prefills every field', async () => {
		const screen = await render(ProfileForm, { values });
		await expect.element(screen.getByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
		await expect.element(screen.getByRole('textbox', { name: 'Username' })).toHaveValue('jane');
		await expect.element(screen.getByRole('textbox', { name: 'Display name' })).toHaveValue('Jane');
		await expect.element(screen.getByRole('textbox', { name: /Bio/ })).toHaveValue('Hi');
		await expect
			.element(screen.getByRole('checkbox', { name: 'Show mature stories' }))
			.toBeChecked();
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('?/profile');
		await expectAccessible(screen.container);
	});

	it('shows welcome, saved, and errors', async () => {
		const screen = await render(ProfileForm, {
			values,
			welcome: true,
			saved: true,
			errors: { username: 'That username is taken.' }
		});
		await expect.element(screen.getByRole('heading', { name: /Welcome/ })).toBeInTheDocument();
		await expect.element(screen.getByText('Profile saved.')).toBeInTheDocument();
		await expect.element(screen.getByText('That username is taken.')).toBeInTheDocument();
	});
});
