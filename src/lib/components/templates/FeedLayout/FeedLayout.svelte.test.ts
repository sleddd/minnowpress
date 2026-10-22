import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import FeedLayout from './FeedLayout.svelte';

describe('FeedLayout', () => {
	it('renders intro, feature, tabs, and content in order', async () => {
		const screen = await render(FeedLayout, {
			props: {
				intro: text('Intro'),
				feature: text('Feature'),
				tabs: text('Tabs'),
				children: text('Feed')
			}
		});
		expect(screen.container.textContent?.replace(/\s+/g, '')).toBe('IntroFeatureTabsFeed');
	});

	it('renders just the content when slots are omitted', async () => {
		const screen = await render(FeedLayout, { children: text('Feed') });
		expect(screen.container.querySelector('.intro')).toBeNull();
		await expect.element(screen.getByText('Feed')).toBeInTheDocument();
	});
});
