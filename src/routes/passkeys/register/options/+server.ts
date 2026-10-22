import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { rp } from '#lib/server/app/index.ts';
import { db } from '#lib/server/db/index.ts';
import { storeChallenge } from '#lib/server/passkey-routes.ts';
import { registrationOptions } from '#lib/server/passkeys.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) error(401, 'Sign in first.');
	const options = await registrationOptions(db, locals.user, rp);
	storeChallenge(cookies, options.challenge, !dev);
	return json(options);
};
