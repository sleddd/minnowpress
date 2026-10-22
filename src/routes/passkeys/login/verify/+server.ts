import { error, json } from '@sveltejs/kit';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { dev } from '$app/env';
import { rp } from '#lib/server/app/index.ts';
import { safeNext, signIn } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { ForbiddenError, NotFoundError } from '#lib/server/errors.ts';
import { readJson, takeChallenge } from '#lib/server/passkey-routes.ts';
import { finishAuthentication } from '#lib/server/passkeys.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const challenge = takeChallenge(cookies);
	const body = await readJson(request);
	try {
		const user = await finishAuthentication(
			db,
			body.response as AuthenticationResponseJSON,
			challenge,
			rp
		);
		await signIn(db, cookies, user.id, !dev, request.headers.get('user-agent'));
		return json({ ok: true, redirect: safeNext(typeof body.next === 'string' ? body.next : null) });
	} catch (e) {
		if (e instanceof NotFoundError || e instanceof ForbiddenError)
			error(400, 'That passkey could not be verified.');
		throw e;
	}
};
