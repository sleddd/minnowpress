import { requireModerator } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { pageParam } from '#lib/server/forms.ts';
import { listModerationLog } from '#lib/server/moderation-log.ts';
import type { PageServerLoad } from './$types';

// Checked here as well as in the admin layout: a client can ask for this page's data alone.
export const load: PageServerLoad = async ({ locals, url }) => {
	requireModerator(locals.user);
	return { log: await listModerationLog(db, { page: pageParam(url.searchParams.get('page')) }) };
};
