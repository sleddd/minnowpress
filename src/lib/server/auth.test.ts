import { isHttpError, isRedirect } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	allowLoginRequest,
	consumeLoginToken,
	LOGIN_LIMITS,
	listSessions,
	revokeOtherSessions,
	revokeSession,
	createLoginToken,
	createSession,
	generateToken,
	hashToken,
	invalidateSession,
	isModerator,
	LOGIN_TOKEN_TTL,
	requireAdmin,
	requireModerator,
	requireUser,
	safeNext,
	SESSION_COOKIE,
	SESSION_TTL,
	sessionCookieOptions,
	signIn,
	validateSession
} from './auth';
import type { DB } from './db/client';
import { loginTokens, sessions } from './db/schema';
import { createTestDb, makeUser } from './testing/db';

const DAY = 24 * 60 * 60 * 1000;
let db: DB;
beforeEach(async () => {
	db = await createTestDb();
});

describe('tokens', () => {
	it('generates unique url-safe tokens and stable hashes', async () => {
		const a = generateToken();
		expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(generateToken()).not.toBe(a);
		expect(await hashToken('x')).toBe(await hashToken('x'));
		expect(await hashToken('x')).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('login tokens', () => {
	it('stores only a hash and works exactly once', async () => {
		const token = await createLoginToken(db, 'a@example.com');
		const [row] = await db.select().from(loginTokens);
		expect(row.tokenHash).not.toBe(token);
		expect(await consumeLoginToken(db, token)).toBe('a@example.com');
		expect(await consumeLoginToken(db, token)).toBeNull();
	});

	it('expires', async () => {
		const now = new Date();
		const token = await createLoginToken(db, 'a@example.com', now);
		expect(
			await consumeLoginToken(db, token, new Date(now.getTime() + LOGIN_TOKEN_TTL))
		).toBeNull();
	});

	it('cleans up expired tokens when issuing new ones', async () => {
		const old = new Date(Date.now() - DAY);
		await createLoginToken(db, 'a@example.com', old);
		await createLoginToken(db, 'b@example.com');
		expect(await db.select().from(loginTokens)).toHaveLength(1);
	});

	it('rejects unknown tokens', async () => {
		expect(await consumeLoginToken(db, 'nope')).toBeNull();
	});

	it('limits links per address and email without letting a stranger lock out the owner', async () => {
		const now = new Date('2026-10-21T12:00:00Z');
		const attacker = { email: 'victim@example.com', ip: '203.0.113.9' };
		for (let i = 0; i < LOGIN_LIMITS.perAddressAndEmail; i++)
			expect(await allowLoginRequest(db, attacker, now)).toBe(true);
		expect(await allowLoginRequest(db, attacker, now)).toBe(false);
		// The real owner, on their own connection, still gets a link.
		expect(await allowLoginRequest(db, { ...attacker, ip: '198.51.100.7' }, now)).toBe(true);
		// The window passes.
		expect(
			await allowLoginRequest(db, attacker, new Date(now.getTime() + LOGIN_TOKEN_TTL + 1))
		).toBe(true);
	});

	it('caps requests per address and per email each hour', async () => {
		const now = new Date('2026-10-21T12:00:00Z');
		for (let i = 0; i < LOGIN_LIMITS.perAddress; i++)
			await allowLoginRequest(db, { email: `p${i}@example.com`, ip: '203.0.113.1' }, now);
		expect(await allowLoginRequest(db, { email: 'new@example.com', ip: '203.0.113.1' }, now)).toBe(
			false
		);
		for (let i = 0; i < LOGIN_LIMITS.perEmail; i++)
			await allowLoginRequest(db, { email: 'busy@example.com', ip: `198.51.100.${i}` }, now);
		expect(await allowLoginRequest(db, { email: 'busy@example.com', ip: '192.0.2.1' }, now)).toBe(
			false
		);
		// Old requests are pruned after an hour.
		const later = new Date(now.getTime() + 61 * 60 * 1000);
		expect(await allowLoginRequest(db, { email: 'busy@example.com', ip: '192.0.2.1' }, later)).toBe(
			true
		);
	});
});

describe('sessions', () => {
	it('creates, validates, and invalidates a session', async () => {
		const user = await makeUser(db);
		const { token, expiresAt } = await createSession(db, user.id);
		expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + SESSION_TTL - 1000);
		expect((await validateSession(db, token))?.user.id).toBe(user.id);
		await invalidateSession(db, token);
		expect(await validateSession(db, token)).toBeNull();
	});

	it('deletes expired sessions', async () => {
		const user = await makeUser(db);
		const now = new Date();
		const { token } = await createSession(db, user.id, now);
		expect(await validateSession(db, token, new Date(now.getTime() + SESSION_TTL))).toBeNull();
		expect(await db.select().from(sessions)).toHaveLength(0);
	});

	it('signs everyone out two days after sign-in, however active they are', async () => {
		expect(SESSION_TTL).toBe(2 * DAY);
		const user = await makeUser(db);
		const start = new Date();
		const { token } = await createSession(db, user.id, start);
		// Using the site doesn't extend the session.
		const almost = new Date(start.getTime() + SESSION_TTL - 1000);
		expect((await validateSession(db, token, almost))?.expiresAt.getTime()).toBe(
			start.getTime() + SESSION_TTL
		);
		expect(await validateSession(db, token, new Date(start.getTime() + SESSION_TTL))).toBeNull();
	});

	it('lists and revokes sessions, keeping the current one', async () => {
		const user = await makeUser(db);
		const other = await makeUser(db);
		const now = new Date();
		const laptop = await createSession(db, user.id, now, 'Mozilla/5.0 (Macintosh) Firefox/130.0');
		const phone = await createSession(db, user.id, now, 'Mozilla/5.0 (iPhone) Safari/605.1');
		const tablet = await createSession(db, user.id, now);
		const theirs = await createSession(db, other.id, now);
		const current = (await validateSession(db, laptop.token))!.sessionId;
		const listed = await listSessions(db, user.id);
		expect(listed).toHaveLength(3);
		expect(listed.find((s) => s.id === current)?.userAgent).toContain('Firefox');

		const phoneId = await hashToken(phone.token);
		await revokeSession(db, other.id, phoneId); // not theirs to revoke
		expect(await validateSession(db, phone.token)).not.toBeNull();
		await revokeSession(db, user.id, phoneId);
		expect(await validateSession(db, phone.token)).toBeNull();

		await revokeOtherSessions(db, user.id, current);
		expect(await validateSession(db, tablet.token)).toBeNull();
		expect(await validateSession(db, laptop.token)).not.toBeNull();
		expect(await validateSession(db, theirs.token)).not.toBeNull();
	});

	it('records last use at most every few minutes', async () => {
		const user = await makeUser(db);
		const start = new Date();
		const { token } = await createSession(db, user.id, start);
		await validateSession(db, token, new Date(start.getTime() + 60 * 1000));
		expect((await listSessions(db, user.id, start))[0].lastUsedAt?.getTime()).toBe(start.getTime());
		const later = new Date(start.getTime() + 10 * 60 * 1000);
		await validateSession(db, token, later);
		expect((await listSessions(db, user.id, start))[0].lastUsedAt?.getTime()).toBe(later.getTime());
	});

	it('returns null for unknown tokens', async () => {
		expect(await validateSession(db, 'nope')).toBeNull();
	});

	it('builds secure cookie options', () => {
		const expires = new Date();
		expect(sessionCookieOptions(expires, true)).toEqual({
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			expires
		});
	});
});

describe('safeNext', () => {
	it('only allows local paths', () => {
		expect(safeNext('/write?x=1')).toBe('/write?x=1');
		expect(safeNext('https://evil.com')).toBe('/');
		expect(safeNext('//evil.com')).toBe('/');
		expect(safeNext('/\\evil.com')).toBe('/');
		expect(safeNext(null)).toBe('/');
	});
});

describe('guards', () => {
	const catchIt = (fn: () => unknown) => {
		try {
			fn();
		} catch (e) {
			return e;
		}
	};

	it('requireUser redirects anonymous visitors to login with next', async () => {
		const e = catchIt(() => requireUser(null, new URL('http://x/write?a=1')));
		expect(isRedirect(e) && e.location).toBe('/login?next=%2Fwrite%3Fa%3D1');
		const user = await makeUser(db);
		expect(requireUser(user, new URL('http://x/'))).toBe(user);
	});

	it('requireModerator and requireAdmin check roles', async () => {
		const plain = await makeUser(db);
		const mod = await makeUser(db, { role: 'mod' });
		const admin = await makeUser(db, { role: 'admin' });
		expect(
			isHttpError(
				catchIt(() => requireModerator(plain)),
				403
			)
		).toBe(true);
		expect(
			isHttpError(
				catchIt(() => requireModerator(null)),
				403
			)
		).toBe(true);
		expect(requireModerator(mod)).toBe(mod);
		expect(requireModerator(admin)).toBe(admin);
		expect(
			isHttpError(
				catchIt(() => requireAdmin(mod)),
				403
			)
		).toBe(true);
		expect(requireAdmin(admin)).toBe(admin);
		expect(isModerator(null)).toBe(false);
	});
});

describe('signIn', () => {
	it('creates a session and sets its cookie', async () => {
		const user = await makeUser(db);
		const set = vi.fn();
		await signIn(db, { set }, user.id, true);
		const [name, token, options] = set.mock.calls[0];
		expect(name).toBe(SESSION_COOKIE);
		expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
		expect((await validateSession(db, token))?.user.id).toBe(user.id);
	});
});
