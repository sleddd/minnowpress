import { error, type Cookies } from '@sveltejs/kit';
import { CHALLENGE_COOKIE, CHALLENGE_TTL_SECONDS } from './passkeys';

/** Stores the WebAuthn challenge in a short-lived, httpOnly cookie scoped to /passkeys. */
export function storeChallenge(cookies: Pick<Cookies, 'set'>, challenge: string, secure: boolean) {
	cookies.set(CHALLENGE_COOKIE, challenge, {
		path: '/passkeys',
		httpOnly: true,
		sameSite: 'strict',
		secure,
		maxAge: CHALLENGE_TTL_SECONDS
	});
}

/** Reads and clears the stored challenge. A challenge can only be used once. */
export function takeChallenge(cookies: Pick<Cookies, 'get' | 'delete'>): string {
	const challenge = cookies.get(CHALLENGE_COOKIE);
	cookies.delete(CHALLENGE_COOKIE, { path: '/passkeys' });
	if (!challenge) error(400, 'The passkey request expired. Try again.');
	return challenge;
}

/**
 * Parses the JSON body of a passkey verify request. The response must be an object with a
 * string credential id: anything else is a 400, not a crash further down.
 */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
	const body = await request.json().catch(() => null);
	const response = (body as { response?: unknown } | null)?.response;
	if (
		!body ||
		typeof body !== 'object' ||
		!response ||
		typeof response !== 'object' ||
		typeof (response as { id?: unknown }).id !== 'string'
	)
		error(400, 'Invalid passkey response.');
	return body as Record<string, unknown>;
}
