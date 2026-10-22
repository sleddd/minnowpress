import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import ProfileLayout from './ProfileLayout.svelte';

describe('ProfileLayout', () => {
	it('puts the profile card beside the stories on wide screens', async () => {
		const screen = await render(ProfileLayout, {
			sidebar: text('Card'),
			children: text('Stories')
		});
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Card');
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe('CardStories');
		const layout = screen.container.querySelector('.profile-layout') as HTMLElement;
		expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(2);
	});
});
