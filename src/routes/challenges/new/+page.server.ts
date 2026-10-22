import { requireUser } from '#lib/server/auth.ts';
import { proposeChallenge } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { formString, toActionFailure } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	requireUser(locals.user, url);
};

export const actions: Actions = {
	default: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		const values = { title: formString(data, 'title'), promptText: formString(data, 'promptText') };
		try {
			await proposeChallenge(db, user.id, values);
			return { proposed: true };
		} catch (e) {
			return toActionFailure(e, { values });
		}
	}
};
