import type { Cookies } from '@sveltejs/kit';
import { DEFAULT_THEME, parseTheme, type Theme } from '#lib/theme.ts';
import type { DB } from './db/client';
import type { User } from './db/schema';
import { updateTheme } from './users';

/** Where a visitor's light/dark choice lives; members keep theirs on their account. */
export const THEME_COOKIE = 'theme';
const YEAR_SECONDS = 365 * 24 * 60 * 60;

/** The theme for a request: the member's saved choice, else the visitor's cookie, else light. */
export function requestTheme(user: Pick<User, 'theme'> | null, cookie: string | undefined): Theme {
	if (user) return user.theme;
	return cookie ? parseTheme(cookie) : DEFAULT_THEME;
}

/**
 * Saves a flip of the lights: on the member's account, so it follows them to other devices, or
 * in a year-long cookie for visitors. Returns the member's updated row, if any.
 */
export async function saveTheme(
	db: DB,
	user: Pick<User, 'id'> | null,
	cookies: Pick<Cookies, 'set'>,
	theme: Theme,
	secure: boolean
): Promise<User | null> {
	if (user) return updateTheme(db, user.id, theme);
	cookies.set(THEME_COOKIE, theme, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: YEAR_SECONDS
	});
	return null;
}
