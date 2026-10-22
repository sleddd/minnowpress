import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import VisuallyHidden from './VisuallyHidden.svelte';

describe('VisuallyHidden', () => {
	it('keeps text in the accessibility tree but off screen', async () => {
		const screen = await render(VisuallyHidden, { children: text('Your profile') });
		const el = screen.container.querySelector('.visually-hidden') as HTMLElement;
		expect(el.textContent).toBe('Your profile');
		expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(1);
	});
});
