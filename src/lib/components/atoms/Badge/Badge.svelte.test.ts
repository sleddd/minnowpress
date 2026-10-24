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

	it('can be a notched ribbon or tag', async () => {
		const ribbon = await render(Badge, { tone: 'accent', shape: 'ribbon', children: text('on') });
		const el = ribbon.container.querySelector('.badge') as HTMLElement;
		expect(el.classList.contains('ribbon')).toBe(true);
		expect(getComputedStyle(el).clipPath).toContain('polygon');
		expect(getComputedStyle(el).textTransform).toBe('none');
		const tag = await render(Badge, {
			tone: 'accent',
			shape: 'tag',
			children: text('this device')
		});
		expect(getComputedStyle(tag.container.querySelector('.badge')!).clipPath).toContain('polygon');
	});
});
