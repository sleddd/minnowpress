import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import TwoFactorPrompt from './TwoFactorPrompt.svelte';

describe('TwoFactorPrompt', () => {
	it('asks for the code and carries where to go next', async () => {
		const screen = await render(TwoFactorPrompt, { next: '/admin' });
		await expect
			.element(screen.getByRole('heading', { name: 'Two-step sign-in' }))
			.toBeInTheDocument();
		const code = screen.getByLabelText('Code');
		await expect.element(code).toHaveAttribute('autocomplete', 'one-time-code');
		await expect.element(code).toBeRequired();
		expect(screen.container.querySelector('input[name="next"]')?.getAttribute('value')).toBe(
			'/admin'
		);
		await expect.element(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows why a code was refused', async () => {
		const screen = await render(TwoFactorPrompt, { next: '/', error: 'That code didn’t work.' });
		await expect.element(screen.getByText('That code didn’t work.')).toBeInTheDocument();
	});
});
