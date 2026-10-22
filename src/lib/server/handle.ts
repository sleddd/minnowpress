import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, sessionCookieOptions, validateSession } from './auth';
import type { DB } from './db/client';
import { DEFAULT_THEME } from '#lib/theme.ts';
import { BLOCKED_CRAWLER_RESPONSE, crawlerChecked, isBlockedCrawler } from './bots';
import { applySecurityHeaders } from './security';

/**
 * Turns away crawlers other than the allowed search engines, resolves the signed-in user from
 * the session cookie, applies their theme, and adds security headers.
 */
export function createHandle(db: DB, opts: { secure: boolean }): Handle {
	return async ({ event, resolve }) => {
		event.locals.user = null;
		event.locals.sessionId = null;
		// Before any database work: a blocked crawler costs nothing.
		if (
			crawlerChecked(event.url.pathname) &&
			isBlockedCrawler(event.request.headers.get('user-agent'))
		) {
			const response = BLOCKED_CRAWLER_RESPONSE();
			applySecurityHeaders(response.headers);
			return response;
		}
		const token = event.cookies.get(SESSION_COOKIE);
		if (token) {
			const session = await validateSession(db, token);
			if (session) {
				event.locals.user = session.user;
				event.locals.sessionId = session.sessionId;
				event.cookies.set(
					SESSION_COOKIE,
					token,
					sessionCookieOptions(session.expiresAt, opts.secure)
				);
			} else {
				event.cookies.delete(SESSION_COOKIE, { path: '/' });
			}
		}

		// Members pick a theme in Settings; everyone else gets the light default. Rendered
		// on the server so the page never flashes the wrong theme. Read at render time so a
		// theme saved by this very request shows at once.
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				const theme = event.locals.user?.theme ?? DEFAULT_THEME;
				return html.replace('%theme%', theme === 'auto' ? '' : theme);
			}
		});
		applySecurityHeaders(response.headers);
		return response;
	};
}
