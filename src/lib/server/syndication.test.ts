import { describe, expect, it } from 'vitest';
import type { FeedItem } from './feeds';
import { storiesFeedXml } from './syndication';

const item = (o: Partial<FeedItem> = {}): FeedItem => ({
	id: 4,
	title: 'Fog',
	body: 'The keeper waited.',
	isMature: false,
	relation: null,
	parentId: null,
	ratingsCount: 0,
	averageRating: null,
	commentsCount: 0,
	publishedAt: new Date('2026-10-20T00:00:00Z'),
	author: { id: 1, username: 'jane', displayName: 'Jane', avatarUrl: null },
	archive: null,
	tags: [],
	...o
});

describe('storiesFeedXml', () => {
	it('builds a feed for a page with absolute links', () => {
		const xml = storiesFeedXml({
			origin: 'https://m.test',
			appName: 'MinnowPress',
			title: '#sea',
			path: '/tags/sea',
			items: [item()]
		});
		expect(xml).toContain('<title>#sea · MinnowPress</title>');
		expect(xml).toContain('<id>https://m.test/tags/sea/feed.xml</id>');
		expect(xml).toContain('href="https://m.test/tags/sea/feed.xml"');
		expect(xml).toContain('<link rel="alternate" type="text/html" href="https://m.test/s/4"/>');
		expect(xml).toContain('<name>Jane</name>');
		expect(xml).toContain('The keeper waited.');
	});

	it('uses the root feed URL for the home page', () => {
		const xml = storiesFeedXml({
			origin: 'https://m.test',
			appName: 'M',
			title: 'Latest',
			path: '/',
			items: []
		});
		expect(xml).toContain('<id>https://m.test/feed.xml</id>');
		expect(xml).toContain('href="https://m.test/feed.xml"');
	});

	it('credits archive stories to their original author and license', () => {
		const xml = storiesFeedXml({
			origin: 'https://m.test',
			appName: 'M',
			title: 'Latest',
			path: '/',
			items: [
				item({
					publishedAt: null,
					archive: { url: 'https://ficly.com/stories/9/', author: 'Kevin', authorUrl: null }
				})
			]
		});
		expect(xml).toContain('<name>Kevin</name>');
		expect(xml).toContain(
			'Originally published on Ficly (https://ficly.com/stories/9/), CC BY-SA 3.0.'
		);
		expect(xml).toContain('<published>1970-01-01T00:00:00.000Z</published>');
	});
});
