import type { Handle } from '@sveltejs/kit/hooks';
import { SESSION_COOKIE, sessionCookieOptions, validateSession } from './auth';
import type { DB } from './db/client';
import { BLOCKED_CRAWLER_RESPONSE, crawlerChecked, isBlockedCrawler } from './bots';
import { applySecurityHeaders } from './security';
import { staffLock } from './two-factor';
import { THEME_COOKIE, requestTheme } from './theme-cookie';

/**
 * Turns away crawlers other than the allowed search engines, resolves the signed-in user from
 * the session cookie, applies their theme, and adds security headers. Staff who haven't passed
 * two-step sign-in on this session are treated as ordinary members until they do.
 */
export function createHandle(db: DB, opts: { secure: boolean }): Handle {
	return async ({ event, resolve }) => {
		event.locals.user = null;
		event.locals.sessionId = null;
		event.locals.staffLock = null;
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
				const lock = staffLock(session.user, session.twoFactorAt);
				// Every role check reads locals.user, so this one line keeps staff powers off.
				event.locals.user = lock ? { ...session.user, role: 'user' } : session.user;
				event.locals.staffLock = lock;
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

		// Members pick a theme in Settings or with the sun; visitors' sun clicks live in a cookie;
		// everyone else gets the light default. Rendered
		// on the server so the page never flashes the wrong theme. Read at render time so a
		// theme saved by this very request shows at once.
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				const theme = requestTheme(event.locals.user, event.cookies.get(THEME_COOKIE));
				return html.replace('%theme%', theme === 'auto' ? '' : theme);
			}
		});
		applySecurityHeaders(response.headers);
		return response;
	};
}
