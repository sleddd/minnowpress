import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { FeedItemView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import FollowingPanel from './FollowingPanel.svelte';

const author = { id: 2, username: 'bo', displayName: 'Bo', avatarUrl: null };
const story = (id: number, title: string): FeedItemView => ({
	id,
	title,
	body: 'A body long enough to read.',
	isMature: false,
	relation: null,
	parentId: null,
	ratingsCount: 0,
	averageRating: null,
	commentsCount: 0,
	publishedAt: new Date('2026-10-20T00:00:00Z'),
	author,
	archive: null,
	tags: []
});

describe('FollowingPanel', () => {
	it('lists stories from people you follow', async () => {
		const screen = await render(FollowingPanel, { items: [story(1, 'Fog')] });
		await expect
			.element(screen.getByRole('region', { name: 'From people you follow' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Fog' })).toHaveAttribute('href', '/s/1');
		await expect
			.element(screen.getByRole('link', { name: 'See all' }))
			.toHaveAttribute('href', '/stories?tab=following');
		await expectAccessible(screen.container);
	});

	it('suggests writers to follow when there is nothing yet', async () => {
		const screen = await render(FollowingPanel, {
			items: [],
			suggestions: [
				{ name: 'Bo', href: '/@bo', username: 'bo', stories: 3, avatarUrl: null, archive: false },
				{
					name: 'THX 0477',
					href: '/authors/ficly/thx0477',
					stories: 552,
					avatarUrl: null,
					archive: true
				}
			]
		});
		await expect.element(screen.getByText(/Nothing here yet\./)).toBeInTheDocument();
		await expect.element(screen.getByText('A few to start with:')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Follow bo' })).toBeInTheDocument();
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/@bo?/follow');
		// Archive authors can't be followed, so they get a reading link instead.
		await expect
			.element(screen.getByRole('link', { name: 'read' }))
			.toHaveAttribute('href', '/authors/ficly/thx0477');
		await expect
			.element(screen.getByRole('link', { name: 'Find more writers' }))
			.toHaveAttribute('href', '/authors');
		await expectAccessible(screen.container);
	});

	it('still offers more writers with no suggestions', async () => {
		const screen = await render(FollowingPanel, { items: [] });
		await expect.element(screen.getByText('A few to start with:')).not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Find more writers' }))
			.toBeInTheDocument();
	});
});
