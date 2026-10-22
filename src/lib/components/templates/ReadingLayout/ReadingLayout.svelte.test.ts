import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import ReadingLayout from './ReadingLayout.svelte';

describe('ReadingLayout', () => {
	it('renders the reading column and the after section', async () => {
		const screen = await render(ReadingLayout, {
			children: text('Story'),
			after: text('Comments')
		});
		await expect.element(screen.getByText('Story')).toBeInTheDocument();
		expect(screen.container.querySelector('.after')?.textContent).toBe('Comments');
	});

	it('omits the after section when not given', async () => {
		const screen = await render(ReadingLayout, { children: text('Story') });
		expect(screen.container.querySelector('.after')).toBeNull();
	});
});
