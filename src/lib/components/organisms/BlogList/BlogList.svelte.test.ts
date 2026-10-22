import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BlogList from './BlogList.svelte';

const post = {
	id: 1,
	slug: 'we-are-back',
	title: 'We are back',
	body: 'Ficly lives on as MinnowPress.',
	status: 'published' as const,
	publishedAt: new Date('2026-10-01T00:00:00Z'),
	updatedAt: new Date(),
	author: 'Editor'
};

describe('BlogList', () => {
	it('lists posts with date, author, excerpt, and a read link', async () => {
		const screen = await render(BlogList, {
			posts: [post, { ...post, id: 2, slug: 'older', title: 'An older note' }],
			page: 1,
			hasMore: false,
			url: { href: 'http://x/blog' }
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'The Minnow Pond' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'We are back' }))
			.toHaveAttribute('href', '/blog/we-are-back');
		await expect.element(screen.getByText('Oct 1').first()).toBeInTheDocument();
		await expect.element(screen.getByText('Editor').first()).toBeInTheDocument();
		await expect.element(screen.getByText(/lives on/).first()).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Read the post' }).first())
			.toHaveAttribute('href', '/blog/we-are-back');
		await expect
			.element(screen.getByRole('link', { name: 'An older note' }))
			.toHaveAttribute('href', '/blog/older');
		await expectAccessible(screen.container);
	});

	it('shows an empty state', async () => {
		const screen = await render(BlogList, {
			posts: [],
			page: 1,
			hasMore: false,
			url: { href: 'http://x/blog' }
		});
		await expect.element(screen.getByText('No posts yet. Check back soon.')).toBeInTheDocument();
	});

	it('copes with posts missing a date or author', async () => {
		const screen = await render(BlogList, {
			posts: [{ ...post, publishedAt: null, author: null }],
			page: 1,
			hasMore: false,
			url: { href: 'http://x/blog' }
		});
		await expect.element(screen.getByRole('link', { name: 'We are back' })).toBeInTheDocument();
	});
});
