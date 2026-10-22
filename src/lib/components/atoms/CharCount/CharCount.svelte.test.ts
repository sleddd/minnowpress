import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CharCount from './CharCount.svelte';

describe('CharCount', () => {
	it('shows count over max in the ok state', async () => {
		const screen = await render(CharCount, { count: 10, max: 1024 });
		const output = screen.getByRole('status');
		await expect.element(output).toHaveTextContent('10 / 1024');
		await expect.element(output).toHaveClass('ok');
	});

	it('warns when near the limit', async () => {
		const screen = await render(CharCount, { count: 1000, max: 1024 });
		await expect.element(screen.getByRole('status')).toHaveClass('near');
	});

	it('flags going over and says by how much', async () => {
		const screen = await render(CharCount, { count: 1030, max: 1024, id: 'body-count' });
		const output = screen.getByRole('status');
		await expect.element(output).toHaveClass('over');
		await expect.element(output).toHaveTextContent('(6 over)');
		await expect.element(output).toHaveAttribute('id', 'body-count');
	});

	it('updates when the count changes', async () => {
		const screen = await render(CharCount, { count: 1, max: 10 });
		await screen.rerender({ count: 11 });
		await expect.element(screen.getByRole('status')).toHaveTextContent('11 / 10');
	});
});
