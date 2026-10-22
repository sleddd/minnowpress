import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { FeedItemView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import StoryFeed from './StoryFeed.svelte';

const author = { id: 1, username: 'jane', displayName: 'Jane', avatarUrl: null };
const item = (o: Partial<FeedItemView> = {}): FeedItemView => ({
	id: 1,
	title: 'The Lighthouse',
	body: 'The keeper had not seen a ship in forty years.',
	isMature: false,
	relation: null,
	parentId: null,
	ratingsCount: 2,
	averageRating: 4,
	commentsCount: 1,
	publishedAt: new Date(),
	author,
	archive: null,
	tags: ['sea'],
	...o
});
const url = new URL('http://x/');
const empty = { title: 'No stories yet', action: { href: '/write', label: 'Write one' } };

describe('StoryFeed', () => {
	it('lists stories with pagination under an accessible label', async () => {
		const screen = await render(StoryFeed, {
			label: 'Latest stories',
			items: [
				item(),
				item({ id: 2, title: 'After', body: 'The ship came at dawn.', relation: 'sequel' })
			],
			page: 1,
			hasMore: true,
			url,
			empty
		});
		await expect
			.element(screen.getByRole('region', { name: 'Latest stories' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'The Lighthouse' }))
			.toHaveAttribute('href', '/s/1');
		await expect.element(screen.getByRole('article', { name: 'After' })).toBeInTheDocument();
		await expect.element(screen.getByText('sequel')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Older' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('can show a heading with a See all link and no pagination', async () => {
		const screen = await render(StoryFeed, {
			label: 'x',
			title: 'New stories',
			more: { href: '/stories', label: 'See all' },
			items: [item()],
			empty
		});
		await expect.element(screen.getByRole('region', { name: 'New stories' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'See all' }))
			.toHaveAttribute('href', '/stories');
		expect(screen.container.querySelector('nav[aria-label="Pages"]')).toBeNull();
	});

	it('shows the empty state', async () => {
		const screen = await render(StoryFeed, { label: 'Feed', items: [], empty });
		await expect
			.element(screen.getByRole('heading', { name: 'No stories yet' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Write one' })).toBeInTheDocument();
	});

	it('can add a note to the heading and hide author names', async () => {
		const screen = await render(StoryFeed, {
			label: 'Stories by Jane',
			title: 'Stories',
			note: 'by Jane',
			showAuthor: false,
			items: [item()],
			empty: { title: 'None' }
		});
		await expect.element(screen.getByRole('region', { name: 'Stories' })).toBeInTheDocument();
		await expect.element(screen.getByText('by Jane')).toBeInTheDocument();
		await expect.element(screen.getByText('Author:')).not.toBeInTheDocument();
	});
});
