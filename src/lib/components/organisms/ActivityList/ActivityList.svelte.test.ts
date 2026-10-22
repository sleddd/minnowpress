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
					continuation: { id: 2, title: 'Negotiation' }
				},
				{ kind: 'comment', at: new Date('2026-10-20T11:00:00Z'), actor, story, continuation: null }
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
});
