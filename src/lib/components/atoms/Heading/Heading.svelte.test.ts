import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Heading from './Heading.svelte';

describe('Heading', () => {
	it('renders an h2 by default with a matching size', async () => {
		const screen = await render(Heading, { children: text('Latest') });
		const h = screen.getByRole('heading', { level: 2, name: 'Latest' });
		await expect.element(h).toHaveClass('lg');
	});

	it('separates level from visual size', async () => {
		const screen = await render(Heading, {
			level: 1,
			size: 'md',
			id: 'page-title',
			children: text('Story')
		});
		const h = screen.getByRole('heading', { level: 1 });
		await expect.element(h).toHaveClass('md');
		await expect.element(h).toHaveAttribute('id', 'page-title');
	});

	it('has a display size for big italic statements', async () => {
		const screen = await render(Heading, { level: 1, size: 'display', children: text('Prequel') });
		await expect.element(screen.getByRole('heading', { level: 1 })).toHaveClass('display');
	});
});
