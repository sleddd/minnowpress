import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import CommentForm from './CommentForm.svelte';

describe('CommentForm', () => {
	it('disables submit until something is typed and counts characters', async () => {
		const screen = await render(CommentForm, { action: '/s/1?/comment' });
		const submit = screen.getByRole('button', { name: 'Comment' });
		await expect.element(submit).toBeDisabled();
		await screen.getByRole('textbox', { name: 'Add a comment' }).fill('Lovely 👍');
		await expect.element(submit).toBeEnabled();
		await expect.element(screen.getByRole('status')).toHaveTextContent('8 / 1024');
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/s/1?/comment');
		await expectAccessible(screen.container);
	});

	it('blocks over-long comments', async () => {
		const screen = await render(CommentForm, { action: 'x', value: 'a'.repeat(1025) });
		await expect.element(screen.getByRole('button')).toBeDisabled();
		await expect.element(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
	});

	it('shows a server error', async () => {
		const screen = await render(CommentForm, { action: 'x', error: 'Comment is empty.' });
		await expect.element(screen.getByText('Comment is empty.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('textbox'))
			.toHaveAttribute('aria-describedby', 'comment-count comment-error');
	});
});
