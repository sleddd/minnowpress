import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import AdminLayout from './AdminLayout.svelte';

describe('AdminLayout', () => {
	it('renders nav, main, and aside', async () => {
		const screen = await render(AdminLayout, {
			nav: text('Nav'),
			children: text('Queue'),
			aside: text('Composer')
		});
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe('NavQueueComposer');
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Composer');
	});

	it('works without an aside or nav', async () => {
		const screen = await render(AdminLayout, { children: text('Queue') });
		await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
		expect(screen.container.textContent?.trim()).toBe('Queue');
	});

	it('heads every admin screen with the same title, intro, and an optional action', async () => {
		const screen = await render(AdminLayout, {
			title: 'Blog posts',
			description: 'Write news for the desk.',
			action: text('New post'),
			children: text('List')
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Blog posts' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Write news for the desk.')).toBeInTheDocument();
		expect(screen.container.querySelector('.action')?.textContent?.trim()).toBe('New post');
	});
});
