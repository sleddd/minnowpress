import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { recentActivity } from '#lib/server/desk.ts';
import { queryInt } from '#lib/server/forms.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 30;

/** All of the member's activity, a page at a time; ?before= (ms) goes further back. */
export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	const before = queryInt(url.searchParams.get('before'));
	const activity = await recentActivity(db, user.id, {
		limit: PAGE_SIZE,
		before: before ? new Date(before) : null,
		showMature: user.showMature
	});
	return { activity, older: before !== null };
};
