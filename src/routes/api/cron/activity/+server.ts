import { error } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import { isAuthorizedCron, runActivityCron } from '#lib/server/cron.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => {
	if (!isAuthorizedCron(request, CRON_SECRET)) error(401, 'Unauthorized');
	return runActivityCron(db);
};
