import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ActivityList from './ActivityList.svelte';

const now = new Date('2026-10-21T12:00:00Z');
const actor = { username: 'henjo', displayName: 'Henjo' };
const story = { id: 1, title: 'Duck Hunting' };

describe('ActivityList', () => {
	it('describes comments and continuations on the member’s stories', async () => {
		const screen = await render(ActivityList, {
			now,
			items: [
				{
					kind: 'sequel',
					at: new Date('2026-10-21T11:00:00Z'),
					actor,
					story,
					continuation: { id: 2, title: 'Negotiation' },
					score: null
				},
				{
					kind: 'comment',
					at: new Date('2026-10-20T11:00:00Z'),
					actor,
					story,
					continuation: null,
					score: null
				}
			]
		});
		await expect
			.element(screen.getByRole('heading', { name: 'Recent Activity' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/wrote a sequel/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Negotiation' }))
			.toHaveAttribute('href', '/s/2');
		await expect.element(screen.getByText(/commented on/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Henjo' }).first())
			.toHaveAttribute('href', '/@henjo');
		await expectAccessible(screen.container);
	});

	it('explains the empty state', async () => {
		const screen = await render(ActivityList, { items: [] });
		await expect.element(screen.getByText(/Nothing yet/)).toBeInTheDocument();
	});

	it('describes ratings, mine and other people’s, and links to more', async () => {
		const screen = await render(ActivityList, {
			now,
			more: { href: '/desk/activity', label: 'All activity' },
			items: [
				{
					kind: 'rated',
					at: new Date('2026-10-21T11:00:00Z'),
					actor: null,
					story,
					continuation: null,
					score: 4
				},
				{
					kind: 'rating',
					at: new Date('2026-10-21T10:00:00Z'),
					actor,
					story: { id: 3, title: 'Mine' },
					continuation: null,
					score: 5
				}
			]
		});
		await expect.element(screen.getByText(/You rated\s+Duck Hunting\s+4 fish/)).toBeInTheDocument();
		await expect.element(screen.getByText(/Henjo\s+rated\s+Mine\s+5 fish/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'All activity' }))
			.toHaveAttribute('href', '/desk/activity');
		await expectAccessible(screen.container);
	});

	it('can head its own page', async () => {
		const screen = await render(ActivityList, { items: [], title: 'Your activity', level: 1 });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Your activity' }))
			.toBeInTheDocument();
	});
});
