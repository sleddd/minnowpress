import { error, json } from '@sveltejs/kit';
import { CRON_SECRET, DATABASE_AUTH_TOKEN, DATABASE_URL } from '$app/env/private';
import { isAuthorizedCron } from '#lib/server/cron.ts';
import { diagnose } from '#lib/server/diagnose.ts';
import type { RequestHandler } from './$types';

/**
 * Rows read per statement for each kind of page, measured on the real database. Same bearer
 * token as the cron jobs: `curl -H "Authorization: Bearer $CRON_SECRET" /api/diagnose`.
 */
export const GET: RequestHandler = async ({ request }) => {
	if (!isAuthorizedCron(request, CRON_SECRET)) error(401, 'Unauthorized');
	try {
		return json(await diagnose(DATABASE_URL, DATABASE_AUTH_TOKEN));
	} catch (e) {
		error(503, e instanceof Error ? e.message : 'Diagnosis failed');
	}
};
