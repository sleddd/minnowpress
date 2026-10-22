import { describe, expect, it } from 'vitest';
import { atomResponse, buildAtomFeed, escapeXml } from './atom';

const feed = {
	id: 'https://m.test/feed.xml',
	title: 'Latest & greatest',
	link: 'https://m.test/',
	self: 'https://m.test/feed.xml',
	updated: new Date('2026-01-01T00:00:00Z'),
	entries: [
		{
			id: 'https://m.test/s/1',
			title: 'Fog <one>',
			link: 'https://m.test/s/1',
			author: "Jane O'Hara",
			published: new Date('2026-10-20T12:00:00Z'),
			content: '<script>alert(1)</script>\nLine two'
		}
	]
};

describe('escapeXml', () => {
	it('escapes markup characters and strips invalid control characters', () => {
		expect(escapeXml(`<a href="x">&'</a>`)).toBe(
			'&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;'
		);
		expect(escapeXml('ok\u0000\u0007\nfine')).toBe('ok\nfine');
	});
});

describe('buildAtomFeed', () => {
	it('builds a valid Atom document with escaped text content', () => {
		const xml = buildAtomFeed(feed);
		expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
		expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
		expect(xml).toContain('<title>Latest &amp; greatest</title>');
		expect(xml).toContain(
			'<link rel="self" type="application/atom+xml" href="https://m.test/feed.xml"/>'
		);
		expect(xml).toContain('<title>Fog &lt;one&gt;</title>');
		expect(xml).toContain('<name>Jane O&apos;Hara</name>');
		expect(xml).toContain(
			'<content type="text">&lt;script&gt;alert(1)&lt;/script&gt;\nLine two</content>'
		);
		expect(xml).not.toContain('<script>');
	});

	it('uses the newest entry as the feed update time', () => {
		expect(buildAtomFeed(feed)).toContain('<updated>2026-10-20T12:00:00.000Z</updated>');
	});

	it('falls back to the given time for an empty feed', () => {
		const xml = buildAtomFeed({ ...feed, entries: [] });
		expect(xml).toContain('<updated>2026-01-01T00:00:00.000Z</updated>');
		expect(xml).not.toContain('<entry>');
	});
});

describe('atomResponse', () => {
	it('sets the Atom content type and caching', async () => {
		const res = atomResponse('<feed/>');
		expect(res.headers.get('content-type')).toBe('application/atom+xml; charset=utf-8');
		expect(res.headers.get('cache-control')).toContain('max-age');
		expect(await res.text()).toBe('<feed/>');
	});
});
