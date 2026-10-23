import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { allowLoginRequest, createLoginToken, safeNext } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { send } from '#lib/server/app/index.ts';
import { magicLinkEmail } from '#lib/server/email.ts';
import { formString } from '#lib/server/forms.ts';
import { isValidEmail, normalizeEmail } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeNext(url.searchParams.get('next'));
	if (locals.user) redirect(303, next);
	return { next, linkError: url.searchParams.get('error') === 'link' };
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const data = await request.formData();
		const email = normalizeEmail(formString(data, 'email'));
		const next = safeNext(formString(data, 'next'));
		// Both sides of the page send the same link; this only says where to show an error.
		const intent: 'signin' | 'join' = formString(data, 'intent') === 'signin' ? 'signin' : 'join';
		if (!isValidEmail(email))
			return fail(400, { email, intent, error: 'Enter a valid email address.' });
		if (!(await allowLoginRequest(db, { email, ip: getClientAddress() })))
			return fail(429, {
				email,
				intent,
				error: 'We already sent a few links. Check your inbox, or try again in 15 minutes.'
			});

		const token = await createLoginToken(db, email);
		// The canonical origin, never the request's Host, so a forged Host can't aim the link elsewhere.
		const link = new URL('/login/verify', PUBLIC_ORIGIN);
		link.searchParams.set('token', token);
		if (next !== '/') link.searchParams.set('next', next);
		await send(magicLinkEmail(email, link.toString(), PUBLIC_APP_NAME));
		return { sentTo: email };
	}
};
