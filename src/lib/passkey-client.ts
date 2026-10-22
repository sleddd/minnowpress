/** Browser side of the passkey ceremonies. Components receive these as callbacks. */
import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
	startRegistration
} from '@simplewebauthn/browser';

export interface PasskeyDeps {
	fetch: typeof fetch;
	startRegistration: typeof startRegistration;
	startAuthentication: typeof startAuthentication;
	supportsAutofill: () => Promise<boolean>;
}

const defaults = (): PasskeyDeps => ({
	fetch,
	startRegistration,
	startAuthentication,
	supportsAutofill: browserSupportsWebAuthnAutofill
});

export type PasskeyResult = { ok: true; redirect?: string } | { ok: false; error: string };

export function passkeysSupported(): boolean {
	return typeof window !== 'undefined' && browserSupportsWebAuthn();
}

function friendly(e: unknown): string {
	if (e instanceof Error && e.name === 'NotAllowedError') return 'Passkey request was cancelled.';
	if (e instanceof Error && e.name === 'InvalidStateError')
		return 'This device already has a passkey for your account.';
	return 'Something went wrong with the passkey. Try again.';
}

async function postJson(deps: PasskeyDeps, url: string, body?: unknown) {
	const res = await deps.fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw Object.assign(new Error(data.message ?? 'Request failed'), { server: true });
	return data;
}

function failure(e: unknown): PasskeyResult {
	const message = (e as { server?: boolean }).server ? (e as Error).message : friendly(e);
	return { ok: false, error: message };
}

export async function registerPasskey(name: string, deps = defaults()): Promise<PasskeyResult> {
	try {
		const optionsJSON = await postJson(deps, '/passkeys/register/options');
		const response = await deps.startRegistration({ optionsJSON });
		await postJson(deps, '/passkeys/register/verify', { response, name });
		return { ok: true };
	} catch (e) {
		return failure(e);
	}
}

export async function signInWithPasskey(
	next: string,
	deps = defaults(),
	opts: { autofill?: boolean } = {}
): Promise<PasskeyResult> {
	try {
		const optionsJSON = await postJson(deps, '/passkeys/login/options');
		const response = await deps.startAuthentication({
			optionsJSON,
			useBrowserAutofill: opts.autofill ?? false
		});
		const data = await postJson(deps, '/passkeys/login/verify', { response, next });
		return { ok: true, redirect: data.redirect ?? '/' };
	} catch (e) {
		return failure(e);
	}
}

/**
 * Offers saved passkeys in the browser's autofill on the email field (conditional UI), so a
 * returning member signs in with one tap. Waits quietly in the background; resolves to null when
 * the browser can't do it or the reader never picks a passkey.
 */
export async function passkeyAutofill(
	next: string,
	deps = defaults()
): Promise<Extract<PasskeyResult, { ok: true }> | null> {
	if (!(await deps.supportsAutofill().catch(() => false))) return null;
	const result = await signInWithPasskey(next, deps, { autofill: true });
	return result.ok ? result : null;
}
