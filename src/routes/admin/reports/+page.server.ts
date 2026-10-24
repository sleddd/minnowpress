import { fail } from '@sveltejs/kit';
import { requireModerator } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { formInt, formString, toActionFailure } from '#lib/server/forms.ts';
import { listOpenReports, resolveReport } from '#lib/server/moderation.ts';
import type { Actions, PageServerLoad } from './$types';

// Checked here as well as in the admin layout: layout and page loads run in parallel, and a
// client can ask /__data.json for the page's data alone, so the layout's check can't guard it.
export const load: PageServerLoad = async ({ locals }) => {
	requireModerator(locals.user);
	return { reports: await listOpenReports(db) };
};

export const actions: Actions = {
	resolve: async ({ locals, request }) => {
		const mod = requireModerator(locals.user);
		const data = await request.formData();
		const reportId = formInt(data, 'reportId');
		const action = formString(data, 'action');
		if (!reportId || (action !== 'remove' && action !== 'mature' && action !== 'dismiss'))
			return fail(400);
		try {
			await resolveReport(db, mod.id, reportId, action);
		} catch (e) {
			return toActionFailure(e);
		}
	}
};
