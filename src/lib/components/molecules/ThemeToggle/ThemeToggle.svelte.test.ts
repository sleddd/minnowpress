import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ThemeToggle from './ThemeToggle.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
	delete document.documentElement.dataset.theme;
});

const hidden = (container: HTMLElement, name: string) =>
	container.querySelector(`input[name="${name}"]`)?.getAttribute('value');

describe('ThemeToggle', () => {
	it('offers to turn the lights off in the light theme', async () => {
		const screen = await render(ThemeToggle, { theme: 'light', path: '/tags' });
		await expect
			.element(screen.getByRole('button', { name: 'Turn the lights off (dark theme)' }))
			.toBeInTheDocument();
		expect(hidden(screen.container, 'theme')).toBe('dark');
		expect(hidden(screen.container, 'next')).toBe('/tags');
		expect(screen.container.querySelector('svg.filled')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('flips the page at once and saves in the background', async () => {
		const fetch = vi.fn(async () => new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetch);
		const screen = await render(ThemeToggle, { theme: 'dark', path: '/' });
		await screen.getByRole('button', { name: 'Turn the lights on (light theme)' }).click();
		expect(document.documentElement.dataset.theme).toBe('light');
		await expect
			.element(screen.getByRole('button', { name: 'Turn the lights off (dark theme)' }))
			.toBeInTheDocument();
		expect(fetch).toHaveBeenCalledOnce();
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/theme');
		expect((init.body as FormData).get('theme')).toBe('light');
	});
});
