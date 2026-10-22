import { redirect } from '@sveltejs/kit';
import { invalidateSession, SESSION_COOKIE } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await invalidateSession(db, token);
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/');
};
