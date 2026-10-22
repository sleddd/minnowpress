import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BlogAdminList from './BlogAdminList.svelte';

const post = {
	id: 1,
	slug: 'hi',
	title: 'Hi',
	body: 'x',
	status: 'published' as const,
	publishedAt: new Date('2026-10-01T00:00:00Z'),
	updatedAt: new Date('2026-10-02T00:00:00Z'),
	author: 'Editor'
};

describe('BlogAdminList', () => {
	it('lists posts with status and links to edit', async () => {
		const screen = await render(BlogAdminList, {
			posts: [post, { ...post, id: 2, title: 'Draft one', status: 'draft', publishedAt: null }]
		});
		await expect
			.element(screen.getByRole('link', { name: 'Hi' }))
			.toHaveAttribute('href', '/admin/blog/1');
		await expect.element(screen.getByText('draft', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('edited Oct 2')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows an empty state', async () => {
		const screen = await render(BlogAdminList, { posts: [] });
		await expect
			.element(screen.getByRole('link', { name: 'Write the first one' }))
			.toBeInTheDocument();
	});
});
