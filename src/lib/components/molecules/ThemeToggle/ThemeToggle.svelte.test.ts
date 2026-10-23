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

	it('flips the page and saves in the background', async () => {
		const fetch = vi.fn(async () => new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetch);
		const screen = await render(ThemeToggle, { theme: 'dark', path: '/' });
		await screen.getByRole('button', { name: 'Turn the lights on (light theme)' }).click();
		await expect
			.element(screen.getByRole('button', { name: 'Turn the lights off (dark theme)' }))
			.toBeInTheDocument();
		expect(document.documentElement.dataset.theme).toBe('light');
		await expect.poll(() => fetch.mock.calls.length).toBe(1);
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('/theme');
		expect((init.body as FormData).get('theme')).toBe('light');
	});

	it('animates the flip as a view transition where the browser has them', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 204 }))
		);
		const startViewTransition = vi.fn((update: () => Promise<void>) => ({
			ready: update().then(() => undefined)
		}));
		const animate = vi.fn();
		vi.stubGlobal('matchMedia', (q: string) => ({
			matches: false,
			media: q,
			addEventListener() {},
			removeEventListener() {}
		}));
		Object.assign(document, { startViewTransition });
		const original = document.documentElement.animate;
		document.documentElement.animate = animate as never;
		try {
			const screen = await render(ThemeToggle, { theme: 'light', path: '/' });
			await screen.getByRole('button', { name: 'Turn the lights off (dark theme)' }).click();
			await expect
				.element(screen.getByRole('button', { name: 'Turn the lights on (light theme)' }))
				.toBeInTheDocument();
			expect(startViewTransition).toHaveBeenCalledOnce();
			expect(document.documentElement.dataset.theme).toBe('dark');
			expect(animate).toHaveBeenCalledWith(
				expect.objectContaining({ clipPath: expect.any(Array) }),
				expect.objectContaining({ pseudoElement: '::view-transition-new(root)' })
			);
		} finally {
			document.documentElement.animate = original;
			delete (document as { startViewTransition?: unknown }).startViewTransition;
		}
	});
});
