import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { avatarTone } from '#lib/avatar.ts';
import Avatar from './Avatar.svelte';

describe('Avatar', () => {
	it('draws a decorative person silhouette tinted by name', async () => {
		const screen = await render(Avatar, { name: 'Jane Doe' });
		const svg = screen.container.querySelector('svg.placeholder')!;
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.classList.contains(`tone-${avatarTone('Jane Doe')}`)).toBe(true);
		expect(svg.classList.contains('md')).toBe(true);
		expect(svg.classList.contains('round')).toBe(true);
		expect(svg.querySelectorAll('.fg')).toHaveLength(2);
		expect(getComputedStyle(svg.querySelector('.bg')!).fill).not.toBe('rgb(0, 0, 0)');
	});

	it('gives different people different tints and the same person the same one', async () => {
		const a = await render(Avatar, { name: 'Henjo' });
		const tone = a.container.querySelector('svg')!.getAttribute('class');
		await a.unmount();
		const b = await render(Avatar, { name: 'Henjo', size: 'lg', shape: 'square' });
		const svg = b.container.querySelector('svg')!;
		expect(svg.getAttribute('class')?.match(/tone-\d/)?.[0]).toBe(tone?.match(/tone-\d/)?.[0]);
		expect(svg.classList.contains('square')).toBe(true);
		expect(svg.classList.contains('lg')).toBe(true);
	});

	it('shows a decorative photo when given a src', async () => {
		const screen = await render(Avatar, {
			name: 'Jane',
			src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
			size: 'sm'
		});
		const img = screen.container.querySelector('img')!;
		expect(img.getAttribute('alt')).toBe('');
		expect(img.classList.contains('sm')).toBe(true);
		expect(screen.container.querySelector('svg')).toBeNull();
	});
});
