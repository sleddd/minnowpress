import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import PasskeyButton from './PasskeyButton.svelte';

describe('PasskeyButton', () => {
	it('runs the ceremony and shows a busy state while waiting', async () => {
		let finish: (v: string | null) => void = () => {};
		const run = vi.fn(() => new Promise<string | null>((r) => (finish = r)));
		const screen = await render(PasskeyButton, { label: 'Sign in with a passkey', run });
		await expectAccessible(screen.container);
		await screen.getByRole('button', { name: 'Sign in with a passkey' }).click();
		await expect
			.element(screen.getByRole('button', { name: 'Waiting for your passkey…' }))
			.toBeDisabled();
		finish(null);
		await expect
			.element(screen.getByRole('button', { name: 'Sign in with a passkey' }))
			.toBeEnabled();
		expect(run).toHaveBeenCalledOnce();
	});

	it('shows the error it gets back', async () => {
		const screen = await render(PasskeyButton, {
			label: 'Add',
			run: async () => 'Passkey request was cancelled.',
			id: 'add'
		});
		await screen.getByRole('button').click();
		await expect
			.element(screen.getByText('Passkey request was cancelled.'))
			.toHaveAttribute('id', 'add-error');
		await expect
			.element(screen.getByRole('button'))
			.toHaveAttribute('aria-describedby', 'add-error');
	});

	it('can leave out the key icon', async () => {
		const screen = await render(PasskeyButton, { label: 'go', run: async () => null, icon: false });
		await expect.element(screen.getByRole('button', { name: 'go' })).toBeInTheDocument();
		expect(screen.container.querySelector('svg')).toBeNull();
	});
});
