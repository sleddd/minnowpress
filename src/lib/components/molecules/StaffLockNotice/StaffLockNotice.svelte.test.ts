import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StaffLockNotice from './StaffLockNotice.svelte';

describe('StaffLockNotice', () => {
	it('sends staff who haven’t entered a code to the code step, then back', async () => {
		const screen = await render(StaffLockNotice, { lock: 'verify', path: '/admin/reports' });
		await expect.element(screen.getByText(/tools are locked on this sign-in/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Enter your authenticator code' }))
			.toHaveAttribute('href', '/login/two-factor?next=%2Fadmin%2Freports');
		await expectAccessible(screen.container);
	});

	it('sends staff without two-step sign-in to set it up', async () => {
		const screen = await render(StaffLockNotice, { lock: 'enroll', path: '/' });
		await expect
			.element(screen.getByRole('link', { name: 'set up two-step sign-in' }))
			.toHaveAttribute('href', '/settings#two-factor');
	});

	it('stays out of the way on the code step itself', async () => {
		const screen = await render(StaffLockNotice, { lock: 'verify', path: '/login/two-factor' });
		expect(screen.container.textContent?.trim()).toBe('');
	});
});
