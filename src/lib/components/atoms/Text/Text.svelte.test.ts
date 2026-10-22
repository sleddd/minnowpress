import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Text from './Text.svelte';

describe('Text', () => {
	it('renders a paragraph by default', async () => {
		const screen = await render(Text, { children: text('Hello') });
		const p = screen.container.querySelector('p')!;
		expect(p.textContent).toBe('Hello');
		expect(p.className).toContain('default');
	});

	it('renders a muted small span', async () => {
		const screen = await render(Text, {
			as: 'span',
			tone: 'muted',
			size: 'sm',
			children: text('note')
		});
		const span = screen.container.querySelector('span.text')!;
		expect(span.classList.contains('muted')).toBe(true);
		expect(span.classList.contains('sm')).toBe(true);
	});

	it('updates tone and size', async () => {
		const screen = await render(Text, { children: text('Hi') });
		await screen.rerender({ tone: 'muted', size: 'lg' });
		const p = screen.container.querySelector('p')!;
		expect(p.classList.contains('muted')).toBe(true);
		expect(p.classList.contains('lg')).toBe(true);
	});
});
