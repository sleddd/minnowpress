import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Thumb from './Thumb.svelte';

describe('Thumb', () => {
	it('is a decorative striped square by default', async () => {
		const screen = await render(Thumb, {});
		const el = screen.container.querySelector('.thumb') as HTMLElement;
		expect(el.getAttribute('aria-hidden')).toBe('true');
		expect(el.classList.contains('md')).toBe(true);
		expect(getComputedStyle(el).backgroundImage).toContain('repeating-linear-gradient');
	});

	it('can be small and round', async () => {
		const screen = await render(Thumb, { size: 'sm', shape: 'round' });
		const el = screen.container.querySelector('.thumb') as HTMLElement;
		expect(el.classList.contains('sm')).toBe(true);
		expect(getComputedStyle(el).borderRadius).not.toBe('0px');
	});
});
