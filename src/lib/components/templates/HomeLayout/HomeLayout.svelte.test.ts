import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import HomeLayout from './HomeLayout.svelte';

describe('HomeLayout', () => {
	it('places hero and feature above, main and sidebar below', async () => {
		const screen = await render(HomeLayout, {
			hero: text('Hero'),
			feature: text('Challenge'),
			sidebar: text('Tags'),
			children: text('Stories')
		});
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe('HeroChallengeStoriesTags');
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Tags');
		const top = screen.container.querySelector('.top') as HTMLElement;
		expect(getComputedStyle(top).gridTemplateColumns.split(' ')).toHaveLength(2);
	});

	it('works with only hero and content', async () => {
		const screen = await render(HomeLayout, { hero: text('Hero'), children: text('Stories') });
		await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
		expect(screen.container.querySelector('.feature')).toBeNull();
	});
});
