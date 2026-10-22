import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import DeskLayout from './DeskLayout.svelte';

describe('DeskLayout', () => {
	it('places the header, a news/activity band, the content, and the sidebar', async () => {
		const screen = await render(DeskLayout, {
			header: text('Header'),
			news: text('News'),
			activity: text('Activity'),
			aside: text('Sidebar'),
			children: text('Following')
		});
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe(
			'HeaderNewsActivityFollowingSidebar'
		);
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Sidebar');
		const band = screen.container.querySelector('.band') as HTMLElement;
		expect(getComputedStyle(band).gridTemplateColumns.split(' ')).toHaveLength(2);
	});
});
