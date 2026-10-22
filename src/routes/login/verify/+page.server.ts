import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { ADMIN_EMAILS } from '$app/env/private';
import { consumeLoginToken, safeNext, signIn } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { ForbiddenError } from '#lib/server/errors.ts';
import { formString } from '#lib/server/forms.ts';
import { findOrCreateUserByEmail } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

// Opening the link only shows a button; signing in takes a POST, so email scanners
// that prefetch links can't use up the one-time token.
export const load: PageServerLoad = ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) redirect(303, '/login?error=link');
	return { token, next: safeNext(url.searchParams.get('next')) };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = await consumeLoginToken(db, formString(data, 'token'));
		if (!email) redirect(303, '/login?error=link');

		let result;
		try {
			result = await findOrCreateUserByEmail(db, email, { adminEmails: ADMIN_EMAILS });
		} catch (e) {
			if (e instanceof ForbiddenError) redirect(303, '/login?error=link');
			throw e;
		}
		await signIn(db, cookies, result.user.id, !dev, request.headers.get('user-agent'));
		redirect(303, result.created ? '/settings?welcome=1' : safeNext(formString(data, 'next')));
	}
};
