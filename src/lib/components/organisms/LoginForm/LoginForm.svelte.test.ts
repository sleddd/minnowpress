import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import LoginForm from './LoginForm.svelte';

describe('LoginForm', () => {
	it('asks for an email and carries next', async () => {
		const screen = await render(LoginForm, { appName: 'MinnowPress', next: '/write' });
		await expect
			.element(screen.getByRole('heading', { name: 'Sign in to MinnowPress' }))
			.toBeInTheDocument();
		const email = screen.getByRole('textbox', { name: 'Email' });
		await expect.element(email).toBeRequired();
		await expect.element(email).toHaveAttribute('autocomplete', 'email');
		expect(new FormData(screen.container.querySelector('form')!).get('next')).toBe('/write');
		await expectAccessible(screen.container);
	});

	it('confirms the link was sent', async () => {
		const screen = await render(LoginForm, { appName: 'M', next: '/', sentTo: 'a@example.com' });
		await expect.element(screen.getByRole('status')).toHaveTextContent('a@example.com');
		expect(screen.container.querySelector('form')).toBeNull();
	});

	it('shows field and link errors', async () => {
		const screen = await render(LoginForm, {
			appName: 'M',
			next: '/',
			email: 'bad',
			error: 'Enter a valid email.',
			linkError: true
		});
		await expect.element(screen.getByRole('alert')).toHaveTextContent('invalid or has expired');
		await expect.element(screen.getByText('Enter a valid email.')).toBeInTheDocument();
		await expect.element(screen.getByRole('textbox')).toHaveValue('bad');
	});

	it('offers passkey sign-in when available', async () => {
		const onPasskey = async () => null;
		const screen = await render(LoginForm, { appName: 'M', next: '/', onPasskey });
		// The email field also offers saved passkeys in the browser's autofill.
		await expect
			.element(screen.getByRole('textbox', { name: 'Email' }))
			.toHaveAttribute('autocomplete', 'email webauthn');
		await expect
			.element(screen.getByRole('button', { name: 'Sign in with a passkey' }))
			.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('hides passkey sign-in otherwise', async () => {
		const screen = await render(LoginForm, { appName: 'M', next: '/' });
		await expect
			.element(screen.getByRole('button', { name: 'Sign in with a passkey' }))
			.not.toBeInTheDocument();
	});
});
