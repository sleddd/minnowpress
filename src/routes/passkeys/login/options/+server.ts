import { json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { rp } from '#lib/server/app/index.ts';
import { storeChallenge } from '#lib/server/passkey-routes.ts';
import { authenticationOptions } from '#lib/server/passkeys.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const options = await authenticationOptions(rp);
	storeChallenge(cookies, options.challenge, !dev);
	return json(options);
};
