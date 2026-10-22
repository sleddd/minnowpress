import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	ANALYTICS_REPORT_HOSTS,
	ANALYTICS_SCRIPT_HOSTS,
	applySecurityHeaders,
	CSP_DIRECTIVES,
	ROUTE_ANNOUNCER_STYLE_HASH,
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
		expect(CSP_DIRECTIVES['style-src']).toEqual([
			'self',
			'unsafe-hashes',
			ROUTE_ANNOUNCER_STYLE_HASH
		]);
		expect(CSP_DIRECTIVES['connect-src']).toEqual(['self', ...ANALYTICS_REPORT_HOSTS]);
		expect(CSP_DIRECTIVES['img-src']).toEqual(['self', 'data:', ...ANALYTICS_REPORT_HOSTS]);
		for (const host of ANALYTICS_REPORT_HOSTS) expect(host).toMatch(/^https:\/\/(\*\.|www\.)/);
		expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(['none']);
		expect(CSP_DIRECTIVES['object-src']).toEqual(['none']);
	});
});

describe('ROUTE_ANNOUNCER_STYLE_HASH', () => {
	it("is the hash of SvelteKit's route announcer style, and nothing else is allowed inline", () => {
		const root = readFileSync(
			'node_modules/@sveltejs/kit/src/runtime/components/root.svelte',
			'utf8'
		);
		const style = root.match(/svelte-announcer[^]*?style="([^"]*)"/)?.[1];
		expect(style).toBeDefined();
		expect(ROUTE_ANNOUNCER_STYLE_HASH).toBe(
			`sha256-${createHash('sha256').update(style!).digest('base64')}`
		);
		expect(CSP_DIRECTIVES['style-src']).not.toContain('unsafe-inline');
	});
});
