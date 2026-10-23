import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { hashToken } from './auth';
import type { DB } from './db/client';
import { recoveryCodes, sessions, users, type User } from './db/schema';
import { ForbiddenError, RateLimitError, ValidationError } from './errors';

/**
 * Two-step sign-in for staff. After signing in by email link or passkey, a moderator or admin
 * is an ordinary member until they enter a code from their authenticator app (RFC 6238 TOTP),
 * so a hijacked inbox or passkey alone never reaches the moderation and admin tools.
 */

const PERIOD_SECONDS = 30;
const DIGITS = 6;
/** Codes from one step either side still count, for phones whose clocks drift. */
const DRIFT_STEPS = 1;
export const MAX_FAILURES = 5;
export const LOCKOUT_MINUTES = 15;
export const RECOVERY_CODE_COUNT = 10;
const ISSUER = 'MinnowPress';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
	let bits = 0;
	let value = 0;
	let out = '';
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
	return out;
}

export function base32Decode(text: string): Uint8Array {
	const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '');
	const out: number[] = [];
	let bits = 0;
	let value = 0;
	for (const char of clean) {
		value = (value << 5) | BASE32.indexOf(char);
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return Uint8Array.from(out);
}

/** A new authenticator secret: 160 random bits, base32 as the apps expect. */
export function generateSecret(): string {
	return base32Encode(randomBytes(20));
}

export function timeStep(now: Date): number {
	return Math.floor(now.getTime() / 1000 / PERIOD_SECONDS);
}

/** The six-digit code for a secret at a time step (RFC 6238, HMAC-SHA1). */
export function totpCode(secret: string, step: number): string {
	const counter = Buffer.alloc(8);
	counter.writeBigUInt64BE(BigInt(step));
	const hmac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
	const offset = hmac[hmac.length - 1] & 15;
	const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
	return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** The link an authenticator app reads from the QR code. */
export function otpauthUri(secret: string, account: string): string {
	const label = encodeURIComponent(`${ISSUER}:${account}`);
	return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}

/** The QR code for an otpauth link, as an SVG data URL an <img> can show. */
export async function qrDataUrl(text: string): Promise<string> {
	const svg = await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** Maps a two-step failure to the one message the form shows; other errors go on up. */
export function twoFactorMessage(e: unknown): string | null {
	if (e instanceof ValidationError) return e.fields.code ?? 'That code didn’t work.';
	if (e instanceof RateLimitError || e instanceof ForbiddenError) return e.message;
	return null;
}

function sameText(a: string, b: string): boolean {
	return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** The time step a code matches, or null. Never one at or before `lastStep`: no replays. */
export function matchingStep(
	secret: string,
	code: string,
	now: Date,
	lastStep: number | null
): number | null {
	const step = timeStep(now);
	for (let s = step - DRIFT_STEPS; s <= step + DRIFT_STEPS; s++) {
		if (lastStep !== null && s <= lastStep) continue;
		if (sameText(totpCode(secret, s), code)) return s;
	}
	return null;
}

export const isStaff = (user: Pick<User, 'role'>) => user.role !== 'user';

/**
 * Why a staff member's staff powers are off on this sign-in: they haven't set up two-step
 * sign-in yet, or haven't entered a code since signing in. Null for members and for staff who
 * have passed the step.
 */
export type StaffLock = 'enroll' | 'verify' | null;

export function staffLock(
	user: Pick<User, 'role' | 'totpEnabledAt'>,
	sessionTwoFactorAt: Date | null
): StaffLock {
	if (!isStaff(user)) return null;
	if (!user.totpEnabledAt) return 'enroll';
	return sessionTwoFactorAt ? null : 'verify';
}

/** Where to send someone who just signed in: staff with two-step sign-in go to the code step. */
export function afterSignIn(user: Pick<User, 'role' | 'totpEnabledAt'>, next: string): string {
	return isStaff(user) && user.totpEnabledAt
		? `/login/two-factor?next=${encodeURIComponent(next)}`
		: next;
}

/**
 * Counts one try before checking it, in a single statement, so a burst of parallel guesses
 * can't all slip in under the limit. Too many failures in a row lock the step for a while.
 */
async function countAttempt(db: DB, userId: number, now: Date): Promise<void> {
	const windowStart = now.getTime() - LOCKOUT_MINUTES * 60 * 1000;
	const [row] = await db
		.update(users)
		.set({
			twoFactorFailures: sql`case when ${users.twoFactorFailedAt} is null or ${users.twoFactorFailedAt} < ${windowStart} then 1 else ${users.twoFactorFailures} + 1 end`,
			twoFactorFailedAt: now
		})
		.where(eq(users.id, userId))
		.returning({ failures: users.twoFactorFailures });
	if (row && row.failures > MAX_FAILURES)
		throw new RateLimitError(`Too many tries. Wait ${LOCKOUT_MINUTES} minutes, then try again.`);
}

async function clearAttempts(db: DB, userId: number, step: number | null): Promise<void> {
	await db
		.update(users)
		.set({
			twoFactorFailures: 0,
			twoFactorFailedAt: null,
			...(step === null ? {} : { totpLastStep: step })
		})
		.where(eq(users.id, userId));
}

const WRONG_CODE = 'That code didn’t work. Check your app and try again.';
const normalizeCode = (code: string) => code.replace(/\s+/g, '');
/** Recovery codes are shown as "abcde-fghij"; typed with or without the dash, they match. */
const recoveryKey = (code: string) => hashToken(code.toLowerCase().replace(/[^a-z0-9]/g, ''));

/**
 * The secret to show while staff set up two-step sign-in: the one already waiting, so reloading
 * the page doesn't change the QR code, or a new one.
 */
export async function pendingSecret(db: DB, user: User): Promise<string> {
	if (user.totpEnabledAt) throw new ForbiddenError('Two-step sign-in is already on.');
	if (user.totpSecret) return user.totpSecret;
	const secret = generateSecret();
	await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id));
	return secret;
}

function newRecoveryCode(): string {
	const raw = base32Encode(randomBytes(8)).slice(0, 10).toLowerCase();
	return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

/**
 * Turns two-step sign-in on once the first code from the app checks out, marks this sign-in as
 * having passed it, and returns recovery codes: shown once, stored only as hashes.
 */
export async function enableTwoFactor(
	db: DB,
	user: User,
	sessionId: string,
	code: string,
	now = new Date()
): Promise<string[]> {
	if (!isStaff(user)) throw new ForbiddenError();
	if (user.totpEnabledAt) throw new ForbiddenError('Two-step sign-in is already on.');
	if (!user.totpSecret) throw new ValidationError({ code: WRONG_CODE });
	await countAttempt(db, user.id, now);
	const step = matchingStep(user.totpSecret, normalizeCode(code), now, null);
	if (step === null) throw new ValidationError({ code: WRONG_CODE });

	const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
	await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
	await db
		.insert(recoveryCodes)
		.values(
			await Promise.all(
				codes.map(async (c) => ({ userId: user.id, codeHash: await recoveryKey(c) }))
			)
		);
	await db.update(users).set({ totpEnabledAt: now }).where(eq(users.id, user.id));
	await clearAttempts(db, user.id, step);
	await db.update(sessions).set({ twoFactorAt: now }).where(eq(sessions.id, sessionId));
	return codes;
}

/**
 * The code step after signing in: an authenticator code, or one of the recovery codes (each
 * works once). Marks this sign-in as having passed it.
 */
export async function verifyTwoFactor(
	db: DB,
	user: User,
	sessionId: string,
	input: string,
	now = new Date()
): Promise<'app' | 'recovery'> {
	if (!user.totpEnabledAt || !user.totpSecret) throw new ForbiddenError();
	await countAttempt(db, user.id, now);
	const code = normalizeCode(input).toLowerCase();

	let used: 'app' | 'recovery' | null = null;
	if (/^\d{6}$/.test(code)) {
		const step = matchingStep(user.totpSecret, code, now, user.totpLastStep);
		if (step !== null) {
			await clearAttempts(db, user.id, step);
			used = 'app';
		}
	} else {
		const [spent] = await db
			.update(recoveryCodes)
			.set({ usedAt: now })
			.where(
				and(
					eq(recoveryCodes.userId, user.id),
					eq(recoveryCodes.codeHash, await recoveryKey(code)),
					isNull(recoveryCodes.usedAt)
				)
			)
			.returning({ id: recoveryCodes.id });
		if (spent) {
			await clearAttempts(db, user.id, null);
			used = 'recovery';
		}
	}
	if (!used) throw new ValidationError({ code: WRONG_CODE });
	await db.update(sessions).set({ twoFactorAt: now }).where(eq(sessions.id, sessionId));
	return used;
}

/**
 * Turns two-step sign-in off, to move it to a new phone: takes a current code, and only from a
 * sign-in that already passed the step. Staff powers stay off until it's set up again.
 */
export async function disableTwoFactor(
	db: DB,
	user: User,
	code: string,
	now = new Date()
): Promise<void> {
	if (!user.totpEnabledAt || !user.totpSecret) throw new ForbiddenError();
	await countAttempt(db, user.id, now);
	const step = matchingStep(user.totpSecret, normalizeCode(code), now, user.totpLastStep);
	if (step === null) throw new ValidationError({ code: WRONG_CODE });
	await db
		.update(users)
		.set({
			totpSecret: null,
			totpEnabledAt: null,
			totpLastStep: null,
			twoFactorFailures: 0,
			twoFactorFailedAt: null
		})
		.where(eq(users.id, user.id));
	await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
	await db.update(sessions).set({ twoFactorAt: null }).where(eq(sessions.userId, user.id));
}

/** How many unused recovery codes the member has left. */
export async function recoveryCodesLeft(db: DB, userId: number): Promise<number> {
	const rows = await db
		.select({ id: recoveryCodes.id })
		.from(recoveryCodes)
		.where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)));
	return rows.length;
}
