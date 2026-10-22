import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Prose from './Prose.svelte';

describe('Prose', () => {
	it('keeps paragraph spacing and line breaks as written', async () => {
		const screen = await render(Prose, { text: 'Line one.\nStill one.\n\nTwo.\n\n\nThree.' });
		const paras = [...screen.container.querySelectorAll<HTMLElement>('.prose p')];
		expect(paras.map((p) => p.textContent)).toEqual(['Line one.\nStill one.', 'Two.', 'Three.']);
		expect(getComputedStyle(paras[0]).whiteSpace).toBe('pre-wrap');
		const lineHeight = parseFloat(getComputedStyle(paras[0]).lineHeight);
		// One blank line is one line of space; two blank lines are two.
		expect(parseFloat(getComputedStyle(paras[0]).marginTop)).toBe(0);
		expect(parseFloat(getComputedStyle(paras[1]).marginTop)).toBeCloseTo(lineHeight, 0);
		expect(parseFloat(getComputedStyle(paras[2]).marginTop)).toBeCloseTo(lineHeight * 2, 0);
	});

	it('never interprets HTML', async () => {
		const screen = await render(Prose, { text: '<img src=x onerror=alert(1)>' });
		expect(screen.container.querySelector('img')).toBeNull();
		await expect.element(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
	});

	it('supports a smaller size', async () => {
		const screen = await render(Prose, { text: 'x', size: 'md' });
		expect(screen.container.querySelector('.prose')?.classList.contains('md')).toBe(true);
	});

	it('updates when the text and size change', async () => {
		const screen = await render(Prose, { text: 'Before' });
		await screen.rerender({ text: 'After', size: 'md' });
		const el = screen.container.querySelector('.prose')!;
		expect(el.textContent?.trim()).toBe('After');
		expect(el.classList.contains('md')).toBe(true);
	});
});
