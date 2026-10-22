import { error, json } from '@sveltejs/kit';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { rp } from '#lib/server/app/index.ts';
import { db } from '#lib/server/db/index.ts';
import { ValidationError } from '#lib/server/errors.ts';
import { readJson, takeChallenge } from '#lib/server/passkey-routes.ts';
import { finishRegistration } from '#lib/server/passkeys.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies, request }) => {
	if (!locals.user) error(401, 'Sign in first.');
	const challenge = takeChallenge(cookies);
	const body = await readJson(request);
	try {
		const passkey = await finishRegistration(
			db,
			locals.user,
			body.response as RegistrationResponseJSON,
			challenge,
			rp,
			typeof body.name === 'string' ? body.name : undefined
		);
		return json({ ok: true, id: passkey.id });
	} catch (e) {
		if (e instanceof ValidationError) error(400, 'That passkey could not be verified.');
		throw e;
	}
};
