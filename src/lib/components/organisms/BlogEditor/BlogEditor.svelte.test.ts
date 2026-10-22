import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BlogEditor from './BlogEditor.svelte';

describe('BlogEditor', () => {
	it('creates a new post with draft and publish intents', async () => {
		const screen = await render(BlogEditor, { values: { title: '', body: '' } });
		await expect.element(screen.getByRole('textbox', { name: 'Title' })).toBeRequired();
		await expect
			.element(screen.getByRole('button', { name: 'Save draft' }))
			.toHaveAttribute('value', 'draft');
		await expect
			.element(screen.getByRole('button', { name: 'Publish' }))
			.toHaveAttribute('value', 'publish');
		await expect.element(screen.getByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('?/save');
		await expectAccessible(screen.container);
	});

	it('edits a published post with errors shown', async () => {
		const screen = await render(BlogEditor, {
			values: { title: 'Hi', body: '' },
			errors: { body: 'Write the post.' },
			post: { id: 2, slug: 'hi', status: 'published' },
			saved: true
		});
		await expect.element(screen.getByText('Saved.')).toBeInTheDocument();
		await expect.element(screen.getByText(/Published at \/blog\/hi/)).toBeInTheDocument();
		await expect.element(screen.getByText('Write the post.')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Delete' }))
			.toHaveAttribute('formaction', '?/delete');
	});
});
