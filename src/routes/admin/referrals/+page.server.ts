import { requireAdmin } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { listReferrals } from '#lib/server/referrals.ts';
import type { PageServerLoad } from './$types';

// Checked here as well as in the admin layout: a client can ask for this page's data alone.
export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return { referrals: await listReferrals(db) };
};
