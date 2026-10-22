import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Eyebrow from './Eyebrow.svelte';

describe('Eyebrow', () => {
	it('renders a small uppercase label', async () => {
		const screen = await render(Eyebrow, { children: text("This week's challenge") });
		const el = screen.container.querySelector('.eyebrow') as HTMLElement;
		expect(el.textContent).toBe("This week's challenge");
		expect(getComputedStyle(el).textTransform).toBe('uppercase');
	});
});
