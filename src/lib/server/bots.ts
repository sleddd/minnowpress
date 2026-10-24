/**
 * Which crawlers may read the site. Every page costs database reads, and most of the traffic
 * that walks the archive is crawlers, so only the search engines readers actually use get in.
 * Anything else that announces itself as a bot is turned away before any database work.
 * A client can lie about its user agent, so this is a cost control, not a security boundary.
 */

/** Search engines allowed to crawl. Kept in step with static/robots.txt. */
export const ALLOWED_CRAWLERS = [
	'Googlebot',
	'Google-InspectionTool',
	'bingbot',
	'BingPreview',
	'DuckDuckBot'
] as const;

const allowed = new RegExp(ALLOWED_CRAWLERS.join('|'), 'i');

/**
 * How a crawler, scraper or script usually announces itself. Browsers never match these;
 * headless browsers are left alone, since the end-to-end tests are one.
 */
const crawler =
	/bot|crawl|spider|slurp|scrap|fetch|python|go-http-client|java\/|libwww|httpclient|okhttp|curl\/|wget\/|facebookexternalhit|bytespider|petalbot|ahrefs|semrush|mj12|dataforseo|yandex|baidu/i;

/** True when the request announces itself as any crawler, allowed or not. */
export function isCrawler(userAgent: string | null | undefined): boolean {
	return Boolean(userAgent) && crawler.test(userAgent!);
}

/** True when the request comes from a crawler that isn't one of the allowed search engines. */
export function isBlockedCrawler(userAgent: string | null | undefined): boolean {
	if (!userAgent) return false;
	return crawler.test(userAgent) && !allowed.test(userAgent);
}

/** Paths crawlers are checked on. The API answers to its own secret and is left alone. */
export function crawlerChecked(pathname: string): boolean {
	return !pathname.startsWith('/api/');
}

export const BLOCKED_CRAWLER_RESPONSE = () =>
	new Response('Crawling is limited to Google, Bing and DuckDuckGo. See /robots.txt.', {
		status: 403,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=86400'
		}
	});
