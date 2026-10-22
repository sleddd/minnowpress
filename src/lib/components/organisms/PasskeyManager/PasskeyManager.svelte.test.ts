import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import PasskeyManager from './PasskeyManager.svelte';

const passkeys = [
	{ id: 'a', name: 'MacBook', createdAt: new Date('2026-10-01T00:00:00Z'), lastUsedAt: new Date() },
	{ id: 'b', name: 'Phone', createdAt: new Date('2026-10-02T00:00:00Z'), lastUsedAt: null }
];

describe('PasskeyManager', () => {
	it('lists passkeys with remove buttons', async () => {
		const screen = await render(PasskeyManager, { passkeys, supported: true, onAdd: vi.fn() });
		await expect.element(screen.getByText('MacBook')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Remove Phone' })).toBeInTheDocument();
		const forms = screen.container.querySelectorAll('form[action="?/removePasskey"]');
		expect(forms).toHaveLength(2);
		expect(new FormData(forms[1] as HTMLFormElement).get('id')).toBe('b');
		await expectAccessible(screen.container);
	});

	it('adds a passkey with the typed name, or a default', async () => {
		const onAdd = vi.fn().mockResolvedValue(null);
		const screen = await render(PasskeyManager, { passkeys: [], supported: true, onAdd });
		await screen.getByRole('button', { name: 'Add a passkey' }).click();
		expect(onAdd).toHaveBeenLastCalledWith('Passkey');
		await screen.getByRole('textbox', { name: /Name this passkey/ }).fill('Work laptop');
		await screen.getByRole('button', { name: 'Add a passkey' }).click();
		expect(onAdd).toHaveBeenLastCalledWith('Work laptop');
	});

	it('explains when the browser has no passkey support', async () => {
		const screen = await render(PasskeyManager, { passkeys: [], supported: false, onAdd: vi.fn() });
		await expect.element(screen.getByText(/doesn't support passkeys/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Add a passkey' }))
			.not.toBeInTheDocument();
	});
});
