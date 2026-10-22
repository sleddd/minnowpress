import { fail } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth.ts';
import {
	closeChallenge,
	deleteChallenge,
	ensureCurrentChallenge,
	listChallenges,
	reopenChallenge,
	rescheduleChallengeDates
} from '#lib/server/challenges.ts';
import { ValidationError } from '#lib/server/errors.ts';
import { db } from '#lib/server/db/index.ts';
import { formDate, formInt, pageParam, toActionFailure } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireAdmin(locals.user);
	await ensureCurrentChallenge(db);
	return listChallenges(db, { page: pageParam(url.searchParams.get('page')) });
};

export const actions: Actions = {
	close: async ({ locals, request }) => {
		requireAdmin(locals.user);
		const id = formInt(await request.formData(), 'id');
		if (!id) return fail(400);
		try {
			const { closed, next } = await closeChallenge(db, id);
			return {
				message: next
					? `Closed “${closed.title}”. “${next.title}” is open now.`
					: `Closed “${closed.title}”. Nothing was waiting, so the daily job will start a new one.`
			};
		} catch (e) {
			return toActionFailure(e);
		}
	},

	delete: async ({ locals, request }) => {
		requireAdmin(locals.user);
		const id = formInt(await request.formData(), 'id');
		if (!id) return fail(400);
		try {
			await deleteChallenge(db, id);
			return { message: 'Challenge deleted.' };
		} catch (e) {
			return toActionFailure(e);
		}
	},

	reopen: async ({ locals, request }) => {
		requireAdmin(locals.user);
		const id = formInt(await request.formData(), 'id');
		if (!id) return fail(400);
		try {
			const c = await reopenChallenge(db, id);
			return { message: `Reopened “${c.title}”. It’s the current challenge again.` };
		} catch (e) {
			return toActionFailure(e);
		}
	},

	dates: async ({ locals, request }) => {
		requireAdmin(locals.user);
		const data = await request.formData();
		const id = formInt(data, 'id');
		if (!id) return fail(400);
		try {
			const c = await rescheduleChallengeDates(db, id, {
				startsAt: formDate(data, 'startsAt') ?? new Date(NaN),
				endsAt: formDate(data, 'endsAt') ?? new Date(NaN)
			});
			return { message: `New dates saved for “${c.title}”.` };
		} catch (e) {
			if (e instanceof ValidationError)
				return fail(400, { datesError: { id, message: Object.values(e.fields).join(' ') } });
			return toActionFailure(e);
		}
	}
};
