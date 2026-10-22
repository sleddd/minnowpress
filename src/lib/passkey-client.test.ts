import { describe, expect, it, vi } from 'vitest';
import {
	passkeysSupported,
	registerPasskey,
	passkeyAutofill,
	signInWithPasskey,
	type PasskeyDeps
} from './passkey-client';

const json = (data: unknown, ok = true) => ({ ok, json: async () => data }) as Response;

function deps(responses: Response[], overrides: Partial<PasskeyDeps> = {}) {
	const fetch = vi.fn();
	for (const r of responses) fetch.mockResolvedValueOnce(r);
	return {
		fetch,
		startRegistration: vi.fn().mockResolvedValue({ id: 'reg' }),
		startAuthentication: vi.fn().mockResolvedValue({ id: 'auth' }),
		supportsAutofill: vi.fn().mockResolvedValue(true),
		...overrides
	} as unknown as PasskeyDeps & { fetch: ReturnType<typeof vi.fn> };
}

const named = (name: string) => Object.assign(new Error(name), { name });

describe('registerPasskey', () => {
	it('fetches options, runs the ceremony, and posts the response with a name', async () => {
		const d = deps([json({ challenge: 'c' }), json({ ok: true })]);
		expect(await registerPasskey('Laptop', d)).toEqual({ ok: true });
		expect(d.fetch.mock.calls[0][0]).toBe('/passkeys/register/options');
		expect(d.startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: 'c' } });
		expect(d.fetch.mock.calls[1][0]).toBe('/passkeys/register/verify');
		expect(JSON.parse(d.fetch.mock.calls[1][1].body)).toEqual({
			response: { id: 'reg' },
			name: 'Laptop'
		});
	});

	it('explains cancellation and duplicate devices', async () => {
		const cancel = deps([json({})], {
			startRegistration: vi.fn().mockRejectedValue(named('NotAllowedError'))
		});
		expect(await registerPasskey('x', cancel)).toEqual({
			ok: false,
			error: 'Passkey request was cancelled.'
		});
		const dup = deps([json({})], {
			startRegistration: vi.fn().mockRejectedValue(named('InvalidStateError'))
		});
		expect(await registerPasskey('x', dup)).toMatchObject({
			ok: false,
			error: expect.stringContaining('already has')
		});
	});

	it('surfaces server messages and generic failures', async () => {
		const server = deps([json({ message: 'Sign in first.' }, false)]);
		expect(await registerPasskey('x', server)).toEqual({ ok: false, error: 'Sign in first.' });
		const broken = deps([
			{
				ok: false,
				json: async () => {
					throw new Error('not json');
				}
			} as unknown as Response
		]);
		expect(await registerPasskey('x', broken)).toEqual({ ok: false, error: 'Request failed' });
		const weird = deps([json({})], { startRegistration: vi.fn().mockRejectedValue('boom') });
		expect(await registerPasskey('x', weird)).toMatchObject({
			ok: false,
			error: expect.stringContaining('Something went wrong')
		});
	});
});

describe('signInWithPasskey', () => {
	it('returns the redirect from the server', async () => {
		const d = deps([json({ challenge: 'c' }), json({ redirect: '/write' })]);
		expect(await signInWithPasskey('/write', d)).toEqual({ ok: true, redirect: '/write' });
		expect(JSON.parse(d.fetch.mock.calls[1][1].body)).toEqual({
			response: { id: 'auth' },
			next: '/write'
		});
	});

	it('defaults the redirect and reports failures', async () => {
		expect(await signInWithPasskey('/', deps([json({}), json({})]))).toEqual({
			ok: true,
			redirect: '/'
		});
		const bad = deps([json({}), json({ message: 'That passkey could not be verified.' }, false)]);
		expect(await signInWithPasskey('/', bad)).toEqual({
			ok: false,
			error: 'That passkey could not be verified.'
		});
	});
});

describe('passkeysSupported', () => {
	it('is false outside a browser', () => {
		expect(passkeysSupported()).toBe(false);
	});
});

describe('passkeyAutofill', () => {
	it('runs a conditional-UI ceremony and returns where to go', async () => {
		const d = deps([json({ challenge: 'c' }), json({ redirect: '/desk' })]);
		expect(await passkeyAutofill('/desk', d)).toEqual({ ok: true, redirect: '/desk' });
		expect(d.startAuthentication).toHaveBeenCalledWith({
			optionsJSON: { challenge: 'c' },
			useBrowserAutofill: true
		});
	});

	it('stays quiet when unsupported or abandoned', async () => {
		const unsupported = deps([], { supportsAutofill: vi.fn().mockResolvedValue(false) });
		expect(await passkeyAutofill('/', unsupported)).toBeNull();
		expect(unsupported.fetch).not.toHaveBeenCalled();
		const broken = deps([], { supportsAutofill: vi.fn().mockRejectedValue(new Error('x')) });
		expect(await passkeyAutofill('/', broken)).toBeNull();
		const aborted = deps([json({ challenge: 'c' })], {
			startAuthentication: vi.fn().mockRejectedValue(named('AbortError'))
		});
		expect(await passkeyAutofill('/', aborted)).toBeNull();
	});
});
