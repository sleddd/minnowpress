import { error } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import { isAuthorizedCron, runPromptCron } from '#lib/server/cron.ts';
import { db } from '#lib/server/db/index.ts';
import { promptClient } from '#lib/server/prompts/index.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => {
	if (!isAuthorizedCron(request, CRON_SECRET)) error(401, 'Unauthorized');
	return runPromptCron(db, promptClient);
};
