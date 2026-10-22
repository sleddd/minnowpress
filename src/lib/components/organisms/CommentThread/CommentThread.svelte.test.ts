import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { CommentView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import CommentThread from './CommentThread.svelte';

const jane = { id: 1, username: 'jane', displayName: 'Jane', avatarUrl: null };
const bob = { id: 2, username: 'bob', displayName: 'Bob', avatarUrl: null };
const comments: CommentView[] = [
	{ id: 1, body: 'Loved it.', createdAt: new Date(), author: jane },
	{ id: 2, body: 'Me too.', createdAt: new Date(), author: bob }
];

describe('CommentThread', () => {
	it('lists comments and lets you delete only your own', async () => {
		const screen = await render(CommentThread, {
			storyId: 5,
			comments,
			viewerId: 1,
			isModerator: false
		});
		await expect.element(screen.getByText('Loved it.')).toBeInTheDocument();
		await expect.element(screen.getByText('Me too.')).toBeInTheDocument();
		expect(screen.container.querySelectorAll('form[action="/s/5?/deleteComment"]')).toHaveLength(1);
		await expect
			.element(screen.getByRole('textbox', { name: 'Add a comment' }))
			.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('lets moderators delete any comment', async () => {
		const screen = await render(CommentThread, {
			storyId: 5,
			comments,
			viewerId: 3,
			isModerator: true
		});
		expect(screen.container.querySelectorAll('form[action="/s/5?/deleteComment"]')).toHaveLength(2);
	});

	it('asks signed-out readers to sign in', async () => {
		const screen = await render(CommentThread, {
			storyId: 5,
			comments: [],
			viewerId: null,
			isModerator: false
		});
		await expect.element(screen.getByText('No comments yet.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Sign in' }))
			.toHaveAttribute('href', '/login?next=/s/5');
		await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('passes the error to the form', async () => {
		const screen = await render(CommentThread, {
			storyId: 5,
			comments: [],
			viewerId: 1,
			isModerator: false,
			error: 'Comment is empty.'
		});
		await expect.element(screen.getByText('Comment is empty.')).toBeInTheDocument();
	});
});
