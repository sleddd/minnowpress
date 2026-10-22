import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import VerifyLogin from './VerifyLogin.svelte';

describe('VerifyLogin', () => {
	it('posts the token and next with a continue button', async () => {
		const screen = await render(VerifyLogin, {
			appName: 'MinnowPress',
			token: 'abc',
			email: 'jane@example.com',
			next: '/write'
		});
		await expect.element(screen.getByText('jane@example.com')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Continue' }))
			.toHaveAttribute('type', 'submit');
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('method')).toBe('POST');
		const data = new FormData(form);
		expect(data.get('token')).toBe('abc');
		expect(data.get('next')).toBe('/write');
		await expectAccessible(screen.container);
	});
});
