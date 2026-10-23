import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import FormLayout from './FormLayout.svelte';

describe('FormLayout', () => {
	it('renders its content in a narrow column', async () => {
		const screen = await render(FormLayout, { children: text('Login') });
		const el = screen.container.querySelector('.form-layout') as HTMLElement;
		expect(el.textContent).toBe('Login');
		expect(getComputedStyle(el).maxWidth).not.toBe('none');
	});

	it('widens for two columns side by side', async () => {
		const narrow = await render(FormLayout, { children: text('a') });
		const narrowWidth = parseFloat(
			getComputedStyle(narrow.container.querySelector('.form-layout') as HTMLElement).maxWidth
		);
		await narrow.unmount();
		const wide = await render(FormLayout, { width: 'wide', children: text('b') });
		const el = wide.container.querySelector('.form-layout') as HTMLElement;
		expect(parseFloat(getComputedStyle(el).maxWidth)).toBeGreaterThan(narrowWidth);
	});
});
