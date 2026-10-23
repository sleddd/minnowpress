import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSession, hashToken } from './auth';
import type { DB } from './db/client';
import { sessions, users, type User } from './db/schema';
import { ForbiddenError, RateLimitError, ValidationError } from './errors';
import { createTestDb, makeUser } from './testing/db';
import {
	LOCKOUT_MINUTES,
	MAX_FAILURES,
	RECOVERY_CODE_COUNT,
	afterSignIn,
	base32Decode,
	base32Encode,
	disableTwoFactor,
	enableTwoFactor,
	matchingStep,
	otpauthUri,
	pendingSecret,
	qrDataUrl,
	recoveryCodesLeft,
	staffLock,
	timeStep,
	totpCode,
	twoFactorMessage,
	verifyTwoFactor
} from './two-factor';

// RFC 6238's test secret, "12345678901234567890" in ASCII.
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const MINUTE = 60_000;

describe('codes', () => {
	it('matches the RFC 6238 test vectors (last six digits)', () => {
		expect(totpCode(RFC_SECRET, timeStep(new Date(59_000)))).toBe('287082');
		expect(totpCode(RFC_SECRET, timeStep(new Date(1_111_111_109_000)))).toBe('081804');
		expect(totpCode(RFC_SECRET, timeStep(new Date(2_000_000_000_000)))).toBe('279037');
	});

	it('round-trips base32', () => {
		const bytes = Uint8Array.from([0, 1, 2, 250, 255, 128, 64]);
		expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
		expect(base32Encode(new TextEncoder().encode('12345678901234567890'))).toBe(RFC_SECRET);
	});

	it('allows one step of clock drift either way, and never a step already used', () => {
		const now = new Date(1_700_000_000_000);
		const step = timeStep(now);
		expect(matchingStep(RFC_SECRET, totpCode(RFC_SECRET, step - 1), now, null)).toBe(step - 1);
		expect(matchingStep(RFC_SECRET, totpCode(RFC_SECRET, step + 1), now, null)).toBe(step + 1);
		expect(matchingStep(RFC_SECRET, totpCode(RFC_SECRET, step - 2), now, null)).toBeNull();
		expect(matchingStep(RFC_SECRET, totpCode(RFC_SECRET, step), now, step)).toBeNull();
		expect(matchingStep(RFC_SECRET, 'abcdef', now, null)).toBeNull();
	});

	it('builds the otpauth link and a QR image for it', async () => {
		const uri = otpauthUri('ABC', 'me@example.com');
		expect(uri).toBe(
			'otpauth://totp/MinnowPress%3Ame%40example.com?secret=ABC&issuer=MinnowPress&algorithm=SHA1&digits=6&period=30'
		);
		expect(await qrDataUrl(uri)).toMatch(/^data:image\/svg\+xml;base64,/);
	});
});

describe('staffLock and afterSignIn', () => {
	const on = new Date();
	it('only ever locks staff', () => {
		expect(staffLock({ role: 'user', totpEnabledAt: null }, null)).toBeNull();
		expect(staffLock({ role: 'admin', totpEnabledAt: null }, null)).toBe('enroll');
		expect(staffLock({ role: 'mod', totpEnabledAt: on }, null)).toBe('verify');
		expect(staffLock({ role: 'admin', totpEnabledAt: on }, on)).toBeNull();
	});

	it('sends staff with two-step sign-in to the code step', () => {
		expect(afterSignIn({ role: 'admin', totpEnabledAt: on }, '/admin?x=1')).toBe(
			'/login/two-factor?next=%2Fadmin%3Fx%3D1'
		);
		expect(afterSignIn({ role: 'admin', totpEnabledAt: null }, '/desk')).toBe('/desk');
		expect(afterSignIn({ role: 'user', totpEnabledAt: on }, '/desk')).toBe('/desk');
	});

	it('maps refusals to a message and leaves other errors alone', () => {
		expect(twoFactorMessage(new ValidationError({ code: 'Nope.' }))).toBe('Nope.');
		expect(twoFactorMessage(new RateLimitError('Slow down.'))).toBe('Slow down.');
		expect(twoFactorMessage(new ForbiddenError('Already on.'))).toBe('Already on.');
		expect(twoFactorMessage(new Error('boom'))).toBeNull();
	});
});

describe('turning it on, using it, and turning it off', () => {
	let db: DB;
	let admin: User;
	let sessionId: string;
	const start = new Date(1_700_000_000_000);
	const at = (minutes: number) => new Date(start.getTime() + minutes * MINUTE);
	const reload = async () =>
		(await db.query.users.findFirst({ where: eq(users.id, admin.id) })) as User;
	const sessionPassed = async (id = sessionId) =>
		(await db.query.sessions.findFirst({ where: eq(sessions.id, id) }))?.twoFactorAt ?? null;

	beforeEach(async () => {
		db = await createTestDb();
		admin = await makeUser(db, { role: 'admin' });
		const { token } = await createSession(db, admin.id, start);
		sessionId = await hashToken(token);
	});

	async function enable() {
		const secret = await pendingSecret(db, admin);
		admin = await reload();
		const codes = await enableTwoFactor(
			db,
			admin,
			sessionId,
			totpCode(secret, timeStep(start)),
			start
		);
		admin = await reload();
		return { secret, codes };
	}

	it('keeps one pending secret until it’s confirmed', async () => {
		const secret = await pendingSecret(db, admin);
		expect(await pendingSecret(db, await reload())).toBe(secret);
	});

	it('turns on with a good code, hands out recovery codes, and passes this sign-in', async () => {
		const secret = await pendingSecret(db, admin);
		admin = await reload();
		await expect(enableTwoFactor(db, admin, sessionId, '000000', start)).rejects.toThrow(
			ValidationError
		);
		const { codes } = await enable();
		expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
		expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
		expect(codes[0]).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
		expect(admin.totpEnabledAt).toEqual(start);
		expect(admin.totpSecret).toBe(secret);
		expect(await sessionPassed()).toEqual(start);
		expect(await recoveryCodesLeft(db, admin.id)).toBe(RECOVERY_CODE_COUNT);
		await expect(pendingSecret(db, admin)).rejects.toThrow(ForbiddenError);
	});

	it('is for staff only', async () => {
		const member = await makeUser(db);
		await expect(enableTwoFactor(db, member, sessionId, '123456')).rejects.toThrow(ForbiddenError);
	});

	it('passes a new sign-in with a fresh code, but not the same code twice', async () => {
		const { secret } = await enable();
		const { token } = await createSession(db, admin.id, at(1));
		const second = await hashToken(token);
		const reused = totpCode(secret, timeStep(start));
		await expect(verifyTwoFactor(db, admin, second, reused, start)).rejects.toThrow(
			ValidationError
		);
		admin = await reload();
		const fresh = totpCode(secret, timeStep(at(1)));
		expect(
			await verifyTwoFactor(db, admin, second, ` ${fresh.slice(0, 3)} ${fresh.slice(3)} `, at(1))
		).toBe('app');
		expect(await sessionPassed(second)).toEqual(at(1));
	});

	it('takes each recovery code once, with or without its dash', async () => {
		const { codes } = await enable();
		expect(await verifyTwoFactor(db, admin, sessionId, codes[0].toUpperCase(), at(1))).toBe(
			'recovery'
		);
		admin = await reload();
		await expect(verifyTwoFactor(db, admin, sessionId, codes[0], at(2))).rejects.toThrow(
			ValidationError
		);
		admin = await reload();
		expect(await verifyTwoFactor(db, admin, sessionId, codes[1].replace('-', ''), at(3))).toBe(
			'recovery'
		);
		expect(await recoveryCodesLeft(db, admin.id)).toBe(RECOVERY_CODE_COUNT - 2);
	});

	it('locks the step after too many wrong codes, even for the right one, for a while', async () => {
		const { secret } = await enable();
		for (let i = 0; i < MAX_FAILURES; i++)
			await expect(verifyTwoFactor(db, admin, sessionId, '000000', at(1))).rejects.toThrow(
				ValidationError
			);
		const right = totpCode(secret, timeStep(at(1)));
		await expect(verifyTwoFactor(db, admin, sessionId, right, at(1))).rejects.toThrow(
			RateLimitError
		);
		admin = await reload();
		const later = at(LOCKOUT_MINUTES + 2);
		expect(
			await verifyTwoFactor(db, admin, sessionId, totpCode(secret, timeStep(later)), later)
		).toBe('app');
		expect((await reload()).twoFactorFailures).toBe(0);
	});

	it('won’t verify an account without it', async () => {
		await expect(verifyTwoFactor(db, admin, sessionId, '123456')).rejects.toThrow(ForbiddenError);
		await expect(disableTwoFactor(db, admin, '123456')).rejects.toThrow(ForbiddenError);
	});

	it('turns off with a current code, dropping secrets, codes, and passed sign-ins', async () => {
		const { secret } = await enable();
		await expect(disableTwoFactor(db, admin, '000000', at(1))).rejects.toThrow(ValidationError);
		admin = await reload();
		await disableTwoFactor(db, admin, totpCode(secret, timeStep(at(1))), at(1));
		admin = await reload();
		expect(admin.totpSecret).toBeNull();
		expect(admin.totpEnabledAt).toBeNull();
		expect(await recoveryCodesLeft(db, admin.id)).toBe(0);
		expect(await sessionPassed()).toBeNull();
		expect(staffLock(admin, null)).toBe('enroll');
	});
});
