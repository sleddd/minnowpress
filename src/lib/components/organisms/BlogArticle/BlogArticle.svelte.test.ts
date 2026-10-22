import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BlogArticle from './BlogArticle.svelte';

const post = {
	id: 3,
	slug: 'we-are-back',
	title: 'We are back',
	body: 'First paragraph.\n\n<script>alert(1)</script>',
	status: 'published' as const,
	publishedAt: new Date('2026-10-01T00:00:00Z'),
	updatedAt: new Date(),
	author: 'Editor',
	authorUsername: 'editor'
};

describe('BlogArticle', () => {
	it('renders the post as text, signed, with links around it', async () => {
		const screen = await render(BlogArticle, {
			post,
			previous: { slug: 'hello', title: 'Hello again' }
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'We are back' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: '← Blog' }))
			.toHaveAttribute('href', '/blog');
		await expect.element(screen.getByText(/Oct 1/)).toBeInTheDocument();
		expect(screen.container.querySelector('script')).toBeNull();
		await expect.element(screen.getByText('Runs the place.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Editor' }).first())
			.toHaveAttribute('href', '/@editor');
		const nav = screen.getByRole('navigation', { name: 'More posts' });
		await expect
			.element(nav.getByRole('link', { name: 'Hello again' }))
			.toHaveAttribute('href', '/blog/hello');
		await expect
			.element(nav.getByRole('link', { name: 'All posts →' }))
			.toHaveAttribute('href', '/blog');
		await expect
			.element(screen.getByRole('link', { name: 'Edit', exact: true }))
			.not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows drafts and an edit link to admins, and the first post has nothing earlier', async () => {
		const screen = await render(BlogArticle, {
			post: { ...post, status: 'draft', publishedAt: null, author: null, authorUsername: null },
			canEdit: true
		});
		await expect.element(screen.getByText(/This post is a draft/)).toBeInTheDocument();
		await expect.element(screen.getByText(/Not published/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Edit', exact: true }))
			.toHaveAttribute('href', '/admin/blog/3');
		await expect.element(screen.getByText('This is the first post.')).toBeInTheDocument();
		await expect.element(screen.getByText('Runs the place.')).not.toBeInTheDocument();
	});

	it('names an author without a profile link', async () => {
		const screen = await render(BlogArticle, { post: { ...post, authorUsername: null } });
		await expect.element(screen.getByText(/— Editor/)).toBeInTheDocument();
	});
});
