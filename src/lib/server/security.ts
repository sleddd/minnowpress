/**
 * Content-Security-Policy is set by SvelteKit itself (kit csp config in vite.config.ts) so it can
 * add nonces and hashes. These are the remaining security headers, applied to every response.
 */
export const SECURITY_HEADERS: Record<string, string> = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'DENY',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Permissions-Policy':
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
};

/**
 * The one third party allowed to run on the site: Google Analytics (the gtag snippet in
 * app.html). It loads its script from googletagmanager.com and reports to the
 * google-analytics.com and analytics.google.com hosts, by fetch or by image beacon.
 */
export const ANALYTICS_SCRIPT_HOSTS = ['https://www.googletagmanager.com'];
export const ANALYTICS_REPORT_HOSTS = [
	'https://*.google-analytics.com',
	'https://*.analytics.google.com',
	'https://www.googletagmanager.com'
];

/**
 * SvelteKit's route announcer (the visually hidden element that reads the new page title to
 * screen readers on navigation) carries one inline style attribute. This is its hash, so that
 * exact value is allowed and every other inline style stays blocked. The test checks it against
 * SvelteKit's own source, so an upgrade that changes the style fails the test, not the page.
 */
export const ROUTE_ANNOUNCER_STYLE_HASH = 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=';

/** CSP directives, shared by the kit config and the tests that check them. */
export const CSP_DIRECTIVES = {
	'default-src': ['self'],
	'script-src': ['self', ...ANALYTICS_SCRIPT_HOSTS],
	'style-src': ['self', 'unsafe-hashes', ROUTE_ANNOUNCER_STYLE_HASH],
	'img-src': ['self', 'data:', ...ANALYTICS_REPORT_HOSTS],
	'font-src': ['self'],
	'connect-src': ['self', ...ANALYTICS_REPORT_HOSTS],
	'form-action': ['self'],
	'frame-ancestors': ['none'],
	'base-uri': ['self'],
	'object-src': ['none']
} as const;

export function applySecurityHeaders(headers: Headers): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
}
