import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { safeNext } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { saveTheme } from '#lib/server/theme-cookie.ts';
import type { RequestHandler } from './$types';

// The sun in the ribbon. With scripts it posts in the background and gets a 204; without, the
// form posts here and comes back to the page it was on.
export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	const data = await request.formData();
	const theme = data.get('theme') === 'dark' ? 'dark' : 'light';
	await saveTheme(db, locals.user, cookies, theme, !dev);
	if (request.headers.get('accept')?.includes('application/json'))
		return new Response(null, { status: 204 });
	const next = data.get('next');
	redirect(303, safeNext(typeof next === 'string' ? next : null));
};
