import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import SessionList from './SessionList.svelte';

const now = Date.now();
const session = (id: string, device: string, current = false) => ({
	id,
	device,
	current,
	signedInAt: new Date(now - 3600_000),
	lastUsedAt: new Date(now - 60_000),
	expiresAt: new Date(now + 86_400_000)
});

describe('SessionList', () => {
	it('lists devices, marks this one, and offers sign-out for the others', async () => {
		const screen = await render(SessionList, {
			sessions: [session('a', 'Firefox on Mac', true), session('b', 'Safari on iPhone')]
		});
		await expect
			.element(screen.getByRole('heading', { name: 'Where you’re signed in' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('This device')).toBeInTheDocument();
		await expect.element(screen.getByText('Safari on iPhone')).toBeInTheDocument();
		const forms = [...screen.container.querySelectorAll('form')];
		expect(forms.map((f) => f.getAttribute('action'))).toEqual([
			'?/revokeSession',
			'?/revokeOtherSessions'
		]);
		expect(new FormData(forms[0]).get('sessionId')).toBe('b');
		await expect
			.element(screen.getByRole('button', { name: 'Sign out everywhere else' }))
			.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('hides sign-out buttons when this is the only device', async () => {
		const screen = await render(SessionList, {
			sessions: [session('a', 'Chrome on Windows', true)],
			revoked: true
		});
		await expect.element(screen.getByText('Signed out.')).toBeInTheDocument();
		await expect.element(screen.getByRole('button')).not.toBeInTheDocument();
	});
});
