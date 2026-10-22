import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Badge from './Badge.svelte';

describe('Badge', () => {
	it('renders neutral by default', async () => {
		const screen = await render(Badge, { children: text('Draft') });
		await expect.element(screen.getByText('Draft').element().parentElement!).toHaveClass('neutral');
	});

	it('applies a tone', async () => {
		const screen = await render(Badge, { tone: 'warning', children: text('Mature') });
		expect(screen.container.querySelector('.badge')?.classList.contains('warning')).toBe(true);
	});

	it('updates its tone', async () => {
		const screen = await render(Badge, { tone: 'neutral', children: text('Draft') });
		await screen.rerender({ tone: 'success' });
		expect(screen.container.querySelector('.badge')?.classList.contains('success')).toBe(true);
	});
});
