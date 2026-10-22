import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import ArticleLayout from './ArticleLayout.svelte';

describe('ArticleLayout', () => {
	it('places the article beside the aside, with sections below', async () => {
		const screen = await render(ArticleLayout, {
			children: text('Story'),
			aside: text('Continue'),
			below: text('Sequels')
		});
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe('StoryContinueSequels');
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Continue');
		const top = screen.container.querySelector('.top') as HTMLElement;
		expect(getComputedStyle(top).gridTemplateColumns.split(' ')).toHaveLength(2);
	});

	it('renders just the article', async () => {
		const screen = await render(ArticleLayout, { children: text('Story') });
		await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
		expect(screen.container.querySelector('.below')).toBeNull();
	});
});
