import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PageMeta from './PageMeta.svelte';

afterEach(() => {
	document.head.querySelectorAll('meta[name], link[rel="alternate"]').forEach((m) => m.remove());
});

describe('PageMeta', () => {
	it('sets the title with the site name and a description', async () => {
		await render(PageMeta, {
			title: 'The Lighthouse',
			siteName: 'MinnowPress',
			description: 'A story.'
		});
		expect(document.title).toBe('The Lighthouse · MinnowPress');
		expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
			'A story.'
		);
		expect(document.head.querySelector('meta[name="referrer"]')).toBeNull();
	});

	it('uses just the site name without a title and can disable the referrer', async () => {
		await render(PageMeta, { siteName: 'MinnowPress', noReferrer: true });
		expect(document.title).toBe('MinnowPress');
		expect(document.head.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe(
			'no-referrer'
		);
	});

	it('advertises an Atom feed', async () => {
		await render(PageMeta, { siteName: 'M', feed: { href: '/tags/sea/feed.xml', title: '#sea' } });
		const link = document.head.querySelector('link[rel="alternate"]');
		expect(link?.getAttribute('type')).toBe('application/atom+xml');
		expect(link?.getAttribute('href')).toBe('/tags/sea/feed.xml');
		expect(link?.getAttribute('title')).toBe('#sea');
	});
});
