import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { readJson, storeChallenge, takeChallenge } from './passkey-routes';
import { CHALLENGE_COOKIE } from './passkeys';

const caught = async (fn: () => unknown) => {
	try {
		await fn();
	} catch (e) {
		return e;
	}
};

describe('storeChallenge / takeChallenge', () => {
	it('round-trips the challenge once through a scoped, httpOnly cookie', () => {
		const jar = new Map<string, string>();
		const set = vi.fn((name: string, value: string) => void jar.set(name, value));
		storeChallenge({ set }, 'abc', true);
		expect(set).toHaveBeenCalledWith(
			CHALLENGE_COOKIE,
			'abc',
			expect.objectContaining({
				path: '/passkeys',
				httpOnly: true,
				sameSite: 'strict',
				secure: true,
				maxAge: 300
			})
		);
		const cookies = {
			get: (n: string) => jar.get(n),
			delete: vi.fn((n: string) => void jar.delete(n))
		};
		expect(takeChallenge(cookies)).toBe('abc');
		expect(cookies.delete).toHaveBeenCalledWith(CHALLENGE_COOKIE, { path: '/passkeys' });
	});

	it('rejects a missing challenge', async () => {
		const e = await caught(() => takeChallenge({ get: () => undefined, delete: () => {} }));
		expect(isHttpError(e, 400)).toBe(true);
	});
});

describe('readJson', () => {
	const req = (body: string) => new Request('http://x', { method: 'POST', body });

	it('returns a body with a response object', async () => {
		expect(await readJson(req('{"response":{"id":"a"},"name":"Mac"}'))).toEqual({
			response: { id: 'a' },
			name: 'Mac'
		});
	});

	it('rejects invalid JSON and bodies without a response', async () => {
		expect(isHttpError(await caught(() => readJson(req('nope'))), 400)).toBe(true);
		expect(isHttpError(await caught(() => readJson(req('{"name":"x"}'))), 400)).toBe(true);
	});
});
