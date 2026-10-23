import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import LoginForm from './LoginForm.svelte';

const onPasskey = async () => null;

describe('LoginForm', () => {
	it('greets returning members with a passkey, and newcomers with an email field', async () => {
		const screen = await render(LoginForm, { appName: 'MinnowPress', next: '/write', onPasskey });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Sign in to MinnowPress' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('region', { name: 'Welcome back' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'sign in with passkey' }))
			.toBeInTheDocument();
		const join = screen.getByRole('region', { name: 'New here?' });
		const email = join.getByRole('textbox', { name: 'Email' });
		await expect.element(email).toBeRequired();
		// The email field also offers saved passkeys in the browser's autofill.
		await expect.element(email).toHaveAttribute('autocomplete', 'email webauthn');
		await expect
			.element(join.getByRole('button', { name: 'join MinnowPress' }))
			.toBeInTheDocument();
		for (const form of screen.container.querySelectorAll('form'))
			expect(new FormData(form).get('next')).toBe('/write');
		// Email sign-in waits behind "No passkey?".
		expect(screen.container.querySelector('details')?.open).toBe(false);
		await expectAccessible(screen.container);
	});

	it('opens email sign-in from “No passkey?”', async () => {
		const screen = await render(LoginForm, { appName: 'M', next: '/', onPasskey });
		await screen.getByText('Email me a sign-in link').click();
		await expect.element(screen.getByRole('textbox', { name: 'Your email' })).toBeVisible();
		const form = screen.container.querySelector('details form') as HTMLFormElement;
		expect(new FormData(form).get('intent')).toBe('signin');
		await expect.element(screen.getByRole('button', { name: 'email me a link' })).toBeVisible();
	});

	it('goes straight to email sign-in without passkeys', async () => {
		const screen = await render(LoginForm, { appName: 'M', next: '/' });
		await expect
			.element(screen.getByRole('button', { name: 'sign in with passkey' }))
			.not.toBeInTheDocument();
		expect(screen.container.querySelector('details')?.open).toBe(true);
		await expect.element(screen.getByRole('textbox', { name: 'Your email' })).toBeVisible();
		await expect
			.element(screen.getByRole('textbox', { name: 'Your email' }))
			.toHaveAttribute('autocomplete', 'email');
		await expectAccessible(screen.container);
	});

	it('confirms the link was sent', async () => {
		const screen = await render(LoginForm, { appName: 'M', next: '/', sentTo: 'a@example.com' });
		await expect.element(screen.getByRole('status')).toHaveTextContent('a@example.com');
		await expect.element(screen.getByRole('heading', { name: 'Check your email' })).toBeVisible();
		expect(screen.container.querySelector('form')).toBeNull();
	});

	it('shows an error on the side it came from, and link errors on top', async () => {
		const screen = await render(LoginForm, {
			appName: 'M',
			next: '/',
			email: 'bad',
			error: 'Enter a valid email.',
			intent: 'signin',
			linkError: true,
			onPasskey
		});
		await expect.element(screen.getByRole('alert')).toHaveTextContent('invalid or has expired');
		expect(screen.container.querySelector('details')?.open).toBe(true);
		await expect.element(screen.getByRole('textbox', { name: 'Your email' })).toHaveValue('bad');
		await expect.element(screen.getByText('Enter a valid email.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('textbox', { name: 'Email', exact: true }))
			.toHaveValue('');

		await screen.rerender({ intent: 'join', email: 'bad', error: 'Enter a valid email.' });
		await expect
			.element(screen.getByRole('textbox', { name: 'Email', exact: true }))
			.toHaveValue('bad');
	});
});
