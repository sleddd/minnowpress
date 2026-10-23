import { THEME_COOKIE, requestTheme } from '#lib/server/theme-cookie.ts';
import { toViewer } from '#lib/server/viewer.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => ({
	viewer: toViewer(locals.user),
	staffLock: locals.staffLock,
	theme: requestTheme(locals.user, cookies.get(THEME_COOKIE))
});
