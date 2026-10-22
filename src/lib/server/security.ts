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

/** CSP directives, shared by the kit config and the tests that check them. */
export const CSP_DIRECTIVES = {
	'default-src': ['self'],
	'script-src': ['self'],
	'style-src': ['self'],
	'img-src': ['self', 'data:', 'https:'],
	'font-src': ['self'],
	'connect-src': ['self'],
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
