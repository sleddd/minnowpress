import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Icon, { ICONS } from './Icon.svelte';

describe('Icon', () => {
	it('is decorative without a label', async () => {
		const screen = await render(Icon, { name: 'fish' });
		const svg = screen.container.querySelector('svg')!;
		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.getAttribute('role')).toBeNull();
		expect(svg.querySelector('path')?.getAttribute('d')).toBe(ICONS.fish);
	});

	it('is an image with a name when labelled', async () => {
		const screen = await render(Icon, { name: 'flag', label: 'Report' });
		await expect.element(screen.getByRole('img', { name: 'Report' })).toBeInTheDocument();
	});

	it('can be filled', async () => {
		const screen = await render(Icon, { name: 'fish', filled: true });
		expect(screen.container.querySelector('svg')?.classList.contains('filled')).toBe(true);
	});
});
