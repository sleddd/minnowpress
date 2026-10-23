import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import TwoFactorSettings from './TwoFactorSettings.svelte';

const qr = 'data:image/svg+xml;base64,PHN2Zy8+';

describe('TwoFactorSettings', () => {
	it('walks staff through setting it up', async () => {
		const screen = await render(TwoFactorSettings, {
			status: { state: 'setup', secret: 'JBSWY3DPEHPK3PXP', qr }
		});
		await expect
			.element(screen.getByRole('img', { name: 'QR code for your authenticator app' }))
			.toHaveAttribute('src', qr);
		await expect.element(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
		await expect.element(screen.getByLabelText('Code from your app')).toBeRequired();
		await expect.element(screen.getByRole('button', { name: 'Turn on' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows recovery codes once, then how many are left and how to turn it off', async () => {
		const screen = await render(TwoFactorSettings, {
			status: { state: 'on', recoveryLeft: 10 },
			recoveryCodes: ['abcde-fghij', 'klmno-pqrst']
		});
		await expect.element(screen.getByText('Two-step sign-in is on.')).toBeInTheDocument();
		await expect.element(screen.getByText('abcde-fghij')).toBeInTheDocument();
		await expect.element(screen.getByText(/10\s+recovery codes left/)).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Turn off' })).toBeInTheDocument();
		await expectAccessible(screen.container);
		await screen.rerender({ status: { state: 'on', recoveryLeft: 1 }, recoveryCodes: null });
		await expect.element(screen.getByText(/1\s+recovery code left/)).toBeInTheDocument();
		await expect.element(screen.getByText('abcde-fghij')).not.toBeInTheDocument();
	});

	it('asks for a code before managing it on a locked sign-in', async () => {
		const screen = await render(TwoFactorSettings, { status: { state: 'locked' } });
		await expect
			.element(screen.getByRole('link', { name: 'Enter your code' }))
			.toHaveAttribute('href', '/login/two-factor?next=%2Fsettings%23two-factor');
		await expect.element(screen.getByRole('button', { name: 'Turn off' })).not.toBeInTheDocument();
	});

	it('says when it was turned off and shows a refused code', async () => {
		const screen = await render(TwoFactorSettings, {
			status: { state: 'setup', secret: 'JBSWY3DPEHPK3PXP', qr },
			turnedOff: true,
			error: 'That code didn’t work.'
		});
		await expect.element(screen.getByText('Two-step sign-in is off.')).toBeInTheDocument();
		await expect.element(screen.getByText('That code didn’t work.')).toBeInTheDocument();
	});
});
