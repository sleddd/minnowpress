import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ReferralTable from './ReferralTable.svelte';

describe('ReferralTable', () => {
	it('lists each code with its visits and sign-ups', async () => {
		const screen = await render(ReferralTable, {
			referrals: [
				{
					code: 'bookfair',
					visits: 40,
					signups: 6,
					firstVisit: new Date('2026-10-01'),
					lastVisit: new Date()
				}
			]
		});
		const row = screen.getByRole('row', { name: /bookfair/ });
		await expect.element(row.getByText('/?ref=bookfair')).toBeInTheDocument();
		await expect.element(row.getByText('40')).toBeInTheDocument();
		await expect.element(row.getByText('6')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('explains how to start when nothing has been counted', async () => {
		const screen = await render(ReferralTable, { referrals: [] });
		await expect.element(screen.getByText('No visits yet')).toBeInTheDocument();
		await expect.element(screen.getByRole('table')).not.toBeInTheDocument();
	});
});
