import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ChallengeView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ChallengeManager from './ChallengeManager.svelte';

const c = (id: number, title: string, o: Partial<ChallengeView> = {}): ChallengeView => ({
	id,
	title,
	promptText: `Prompt for ${title}`,
	source: 'human',
	startsAt: new Date('2026-10-01T00:00:00Z'),
	endsAt: new Date('2026-10-15T00:00:00Z'),
	entries: 2,
	...o
});

describe('ChallengeManager', () => {
	it('lets admins close the open challenge and delete any of them', async () => {
		const screen = await render(ChallengeManager, {
			open: [c(1, 'Fog', { source: 'ai' })],
			upcoming: [c(2, 'Tide')],
			closed: [c(3, 'Rain')],
			message: 'Closed “Fog”.'
		});
		await expect.element(screen.getByText('Closed “Fog”.')).toBeInTheDocument();
		await expect.element(screen.getByText('Readers can enter this one.')).toBeInTheDocument();
		await expect.element(screen.getByText('Next in line')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Close now' })).toBeInTheDocument();
		expect(screen.container.querySelectorAll('form[action="?/close"]')).toHaveLength(1);
		expect(screen.container.querySelectorAll('form[action="?/delete"]')).toHaveLength(3);
		expect(screen.container.querySelectorAll('form[action="?/reopen"]')).toHaveLength(1);
		expect(screen.container.querySelectorAll('form[action="?/dates"]')).toHaveLength(3);
		const dates = screen.container.querySelector('form[action="?/dates"]') as HTMLFormElement;
		expect(new FormData(dates).get('startsAt')).toBe('2026-10-01');
		expect(new FormData(dates).get('endsAt')).toBe('2026-10-15');
		await screen.getByText('Delete', { exact: true }).first().click();
		await expect.element(screen.getByRole('button', { name: 'Delete “Fog”' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Coming up' })).toBeInTheDocument();
		await expect.element(screen.getByRole('heading', { name: 'Past' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('says when nothing is open and pages past challenges', async () => {
		const screen = await render(ChallengeManager, {
			open: [],
			upcoming: [],
			closed: [c(3, 'Rain')],
			page: 2,
			hasMore: true,
			url: { href: 'http://localhost/admin/challenges?page=2' }
		});
		await expect.element(screen.getByText('Nothing is open.')).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: /Older/ })).toBeInTheDocument();
		await screen.rerender({ open: [], upcoming: [], closed: [], page: 1, hasMore: false });
		await expect.element(screen.getByText('Nothing is open.')).toBeInTheDocument();
	});

	it('opens the dates form on the row with a date problem', async () => {
		const screen = await render(ChallengeManager, {
			open: [c(1, 'Fog')],
			upcoming: [],
			closed: [],
			datesError: { id: 1, message: 'The end has to come after the start.' }
		});
		await expect
			.element(screen.getByRole('alert'))
			.toHaveTextContent('The end has to come after the start.');
		expect((screen.container.querySelector('details.dates') as HTMLDetailsElement).open).toBe(true);
	});
});
