import { describe, expect, it } from 'vitest';
import {
	ALLOWED_CRAWLERS,
	BLOCKED_CRAWLER_RESPONSE,
	crawlerChecked,
	isBlockedCrawler,
	isCrawler
} from './bots';

const chrome =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const headless = chrome.replace('Chrome/', 'HeadlessChrome/');
const iphone =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0';

describe('isCrawler', () => {
	it('spots allowed and blocked crawlers alike, but never browsers', () => {
		expect(
			isCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
		).toBe(true);
		expect(isCrawler('curl/8.4.0')).toBe(true);
		for (const ua of [chrome, headless, iphone, firefox, '', null, undefined])
			expect(isCrawler(ua), String(ua)).toBe(false);
	});
});

describe('isBlockedCrawler', () => {
	it('lets browsers through, including headless ones and no user agent at all', () => {
		for (const ua of [chrome, headless, iphone, firefox, '', null, undefined])
			expect(isBlockedCrawler(ua), String(ua)).toBe(false);
	});

	it('lets Google, Bing and DuckDuckGo through', () => {
		for (const ua of [
			'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
			'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 BingPreview/1.0b',
			'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)'
		])
			expect(isBlockedCrawler(ua), ua).toBe(false);
		expect(ALLOWED_CRAWLERS).toContain('Googlebot');
	});

	it('turns away every other crawler, scraper and script', () => {
		for (const ua of [
			'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
			'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
			'CCBot/2.0 (https://commoncrawl.org/faq/)',
			'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
			'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
			'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
			'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
			'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
			'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
			'Twitterbot/1.0',
			'python-requests/2.32.0',
			'curl/8.7.1',
			'Wget/1.21',
			'Go-http-client/2.0',
			'Scrapy/2.11 (+https://scrapy.org)',
			'node-fetch/1.0'
		])
			expect(isBlockedCrawler(ua), ua).toBe(true);
	});
});

describe('crawlerChecked', () => {
	it('checks pages and feeds but leaves the API to its own secret', () => {
		expect(crawlerChecked('/')).toBe(true);
		expect(crawlerChecked('/s/12')).toBe(true);
		expect(crawlerChecked('/feed.xml')).toBe(true);
		expect(crawlerChecked('/api/cron/digest')).toBe(false);
		expect(crawlerChecked('/api/diagnose')).toBe(false);
	});
});

describe('BLOCKED_CRAWLER_RESPONSE', () => {
	it('is a cacheable plain-text 403 that points at robots.txt', async () => {
		const res = BLOCKED_CRAWLER_RESPONSE();
		expect(res.status).toBe(403);
		expect(res.headers.get('content-type')).toContain('text/plain');
		expect(res.headers.get('cache-control')).toContain('max-age');
		expect(await res.text()).toContain('/robots.txt');
	});
});
