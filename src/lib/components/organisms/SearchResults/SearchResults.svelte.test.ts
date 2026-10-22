import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { FeedItemView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import SearchResults from './SearchResults.svelte';

const story: FeedItemView = {
	id: 1,
	title: 'Duck Suit',
	body: 'Quack.',
	isMature: false,
	relation: null,
	parentId: null,
	ratingsCount: 0,
	averageRating: null,
	commentsCount: 0,
	publishedAt: new Date(),
	author: { id: 1, username: 'jane', displayName: 'Jane', avatarUrl: null },
	archive: null,
	tags: []
};
const url = { href: 'http://x/search?q=duck' };

describe('SearchResults', () => {
	it('groups matching stories, authors, and tags', async () => {
		const screen = await render(SearchResults, {
			query: 'duck',
			stories: { items: [story], page: 1, hasMore: true },
			authors: [
				{ name: 'Duck Fan', href: '/@duckfan', stories: 3, avatarUrl: null, archive: false }
			],
			tags: [{ name: 'ducks', count: 4 }],
			url
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Results for “duck”' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Duck Suit' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Duck Fan' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'ducks' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Older' }))
			.toHaveAttribute('href', '/search?q=duck&page=2');
		await expectAccessible(screen.container);
	});

	it('only shows authors and tags on the first page', async () => {
		const screen = await render(SearchResults, {
			query: 'duck',
			stories: { items: [story], page: 2, hasMore: false },
			authors: [
				{ name: 'Duck Fan', href: '/@duckfan', stories: 3, avatarUrl: null, archive: false }
			],
			tags: [],
			url
		});
		await expect.element(screen.getByRole('link', { name: 'Duck Fan' })).not.toBeInTheDocument();
	});

	it('says when nothing matched', async () => {
		const screen = await render(SearchResults, {
			query: 'zzz',
			stories: { items: [], page: 1, hasMore: false },
			authors: [],
			tags: [],
			url
		});
		await expect.element(screen.getByText(/Nothing matched/)).toBeInTheDocument();
	});
});
