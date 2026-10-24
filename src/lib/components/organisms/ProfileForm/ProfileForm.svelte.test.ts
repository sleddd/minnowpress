import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ProfileForm from './ProfileForm.svelte';

const values = { username: 'jane', displayName: 'Jane', bio: 'Hi', website: '', showMature: true };

describe('ProfileForm', () => {
	it('prefills every field', async () => {
		const screen = await render(ProfileForm, { values });
		await expect.element(screen.getByRole('region', { name: 'Profile' })).toBeInTheDocument();
		await expect.element(screen.getByText('/@', { exact: true })).toBeInTheDocument();
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
		await expect.element(screen.getByText(/We picked a username/)).toBeInTheDocument();
		await expect.element(screen.getByText('Profile saved.')).toBeInTheDocument();
		await expect.element(screen.getByText('That username is taken.')).toBeInTheDocument();
	});

	it('asks members to confirm they’re 18 or older before showing mature stories', async () => {
		const screen = await render(ProfileForm, {
			values: { ...values, showMature: false },
			errors: { adultConfirmed: 'Confirm you’re 18 or older to see mature stories.' }
		});
		const adult = screen.getByRole('checkbox', { name: 'I’m 18 or older' });
		await expect.element(adult).not.toBeInTheDocument();
		await screen.getByRole('checkbox', { name: 'Show mature stories' }).click();
		await expect.element(adult).toBeRequired();
		await expect
			.element(screen.getByText('Confirm you’re 18 or older to see mature stories.'))
			.toBeInTheDocument();
		await expectAccessible(screen.container);
		await screen.unmount();

		const confirmed = await render(ProfileForm, { values, adultConfirmed: true });
		await expect
			.element(confirmed.getByRole('checkbox', { name: 'I’m 18 or older' }))
			.not.toBeInTheDocument();
	});

	it('shows the site before the username', async () => {
		const screen = await render(ProfileForm, { values, profilePrefix: 'minnowpress.com/@' });
		await expect.element(screen.getByText('minnowpress.com/@')).toBeInTheDocument();
	});
});
