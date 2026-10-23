import { fail, redirect } from '@sveltejs/kit';
import { requireUser, safeNext } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { formString } from '#lib/server/forms.ts';
import { twoFactorMessage, verifyTwoFactor } from '#lib/server/two-factor.ts';
import { getUserById } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

// The code step after signing in, for staff with two-step sign-in. Anyone else, or staff who
// already passed it on this sign-in, goes straight on.
export const load: PageServerLoad = ({ locals, url }) => {
	requireUser(locals.user, url);
	const next = safeNext(url.searchParams.get('next'));
	if (locals.staffLock !== 'verify') redirect(303, next);
	return { next };
};

export const actions: Actions = {
	default: async ({ locals, url, request }) => {
		const viewer = requireUser(locals.user, url);
		const data = await request.formData();
		const next = safeNext(formString(data, 'next'));
		if (locals.staffLock !== 'verify' || !locals.sessionId) redirect(303, next);
		// locals.user has staff powers switched off; the check needs the stored account.
		const user = await getUserById(db, viewer.id);
		if (!user) redirect(303, '/login');
		try {
			await verifyTwoFactor(db, user, locals.sessionId, formString(data, 'code'));
		} catch (e) {
			const message = twoFactorMessage(e);
			if (message === null) throw e;
			return fail(400, { error: message, next });
		}
		redirect(303, next);
	}
};
