import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Logo from './Logo.svelte';

describe('Logo', () => {
	it('splits names ending in "press" into a bold head and italic tail', async () => {
		const screen = await render(Logo, { name: 'MinnowPress' });
		const word = screen.container.querySelector('.word')!;
		expect(word.textContent).toBe('minnowpress');
		expect(word.querySelector('em')?.textContent).toBe('press');
		expect(screen.container.querySelector('svg')).toBeNull();
	});

	it('shows other names whole, in the small size', async () => {
		const screen = await render(Logo, { name: 'Fic', size: 'sm' });
		expect(screen.container.querySelector('.word')?.textContent).toBe('fic');
		expect(screen.container.querySelector('.logo')?.classList.contains('sm')).toBe(true);
	});

	it('has a light tone for the ribbon', async () => {
		const screen = await render(Logo, { name: 'MinnowPress', tone: 'ribbon' });
		expect(screen.container.querySelector('.logo')?.classList.contains('ribbon')).toBe(true);
	});

	it('can show a tagline', async () => {
		const screen = await render(Logo, {
			name: 'MinnowPress',
			tagline: 'Little stories, endless sequels.'
		});
		expect(screen.container.querySelector('.tagline')?.textContent).toBe(
			'Little stories, endless sequels.'
		);
	});
});
