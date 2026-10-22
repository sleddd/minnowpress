import { describe, expect, it } from 'vitest';
import {
	ANALYTICS_REPORT_HOSTS,
	ANALYTICS_SCRIPT_HOSTS,
	applySecurityHeaders,
	CSP_DIRECTIVES,
	SECURITY_HEADERS
} from './security';

describe('applySecurityHeaders', () => {
	it('sets every security header', () => {
		const headers = new Headers();
		applySecurityHeaders(headers);
		for (const name of [
			'Strict-Transport-Security',
			'X-Content-Type-Options',
			'Referrer-Policy',
			'Permissions-Policy',
			'X-Frame-Options'
		]) {
			expect(headers.get(name)).toBe(SECURITY_HEADERS[name]);
		}
		expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(headers.get('Permissions-Policy')).toContain('camera=()');
	});

	it('does not override headers a route set itself', () => {
		const headers = new Headers({ 'Referrer-Policy': 'no-referrer' });
		applySecurityHeaders(headers);
		expect(headers.get('Referrer-Policy')).toBe('no-referrer');
	});
});

describe('CSP_DIRECTIVES', () => {
	it('allows same-origin scripts, styles and connections, plus Google Analytics', () => {
		expect(CSP_DIRECTIVES['script-src']).toEqual(['self', ...ANALYTICS_SCRIPT_HOSTS]);
		expect(ANALYTICS_SCRIPT_HOSTS).toEqual(['https://www.googletagmanager.com']);
		expect(CSP_DIRECTIVES['style-src']).toEqual(['self']);
		expect(CSP_DIRECTIVES['connect-src']).toEqual(['self', ...ANALYTICS_REPORT_HOSTS]);
		expect(CSP_DIRECTIVES['img-src']).toEqual(['self', 'data:', ...ANALYTICS_REPORT_HOSTS]);
		for (const host of ANALYTICS_REPORT_HOSTS) expect(host).toMatch(/^https:\/\/(\*\.|www\.)/);
		expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(['none']);
		expect(CSP_DIRECTIVES['object-src']).toEqual(['none']);
	});
});
