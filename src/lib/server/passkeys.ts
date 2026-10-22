import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { and, asc, eq } from 'drizzle-orm';
import type { DB } from './db/client';
import { passkeys, users, type Passkey, type User } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

/** The short-lived cookie that holds the current WebAuthn challenge between options and verify. */
export const CHALLENGE_COOKIE = 'webauthn_challenge';
export const CHALLENGE_TTL_SECONDS = 5 * 60;
export const PASSKEY_NAME_MAX = 50;

export interface RelyingParty {
	id: string;
	name: string;
	origin: string;
}

export function relyingParty(origin: string, name: string): RelyingParty {
	const url = new URL(origin);
	return { id: url.hostname, name, origin: url.origin };
}

export function listPasskeys(db: DB, userId: number) {
	return db
		.select({
			id: passkeys.id,
			name: passkeys.name,
			createdAt: passkeys.createdAt,
			lastUsedAt: passkeys.lastUsedAt
		})
		.from(passkeys)
		.where(eq(passkeys.userId, userId))
		.orderBy(asc(passkeys.createdAt));
}

export async function registrationOptions(db: DB, user: User, rp: RelyingParty) {
	const existing = await db.select().from(passkeys).where(eq(passkeys.userId, user.id));
	return generateRegistrationOptions({
		rpName: rp.name,
		rpID: rp.id,
		userName: user.username,
		userDisplayName: user.displayName,
		userID: new TextEncoder().encode(String(user.id)),
		attestationType: 'none',
		excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports ?? undefined })),
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
	});
}

export async function finishRegistration(
	db: DB,
	user: User,
	response: RegistrationResponseJSON,
	expectedChallenge: string,
	rp: RelyingParty,
	name = 'Passkey'
): Promise<Passkey> {
	const result = await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin: rp.origin,
		expectedRPID: rp.id
	}).catch(() => ({ verified: false as const }));
	if (!result.verified)
		throw new ValidationError({ passkey: 'That passkey could not be verified.' });

	const { credential } = result.registrationInfo;
	const [row] = await db
		.insert(passkeys)
		.values({
			id: credential.id,
			userId: user.id,
			publicKey: isoBase64URL.fromBuffer(credential.publicKey),
			counter: credential.counter,
			transports: credential.transports ?? null,
			name: name.trim().slice(0, PASSKEY_NAME_MAX) || 'Passkey'
		})
		.returning();
	return row;
}

/** Discoverable-credential sign-in: the browser offers whichever passkeys it has for this site. */
export function authenticationOptions(rp: RelyingParty) {
	return generateAuthenticationOptions({ rpID: rp.id, userVerification: 'preferred' });
}

export async function finishAuthentication(
	db: DB,
	response: AuthenticationResponseJSON,
	expectedChallenge: string,
	rp: RelyingParty
): Promise<User> {
	const [row] = await db
		.select({ passkey: passkeys, user: users })
		.from(passkeys)
		.innerJoin(users, eq(users.id, passkeys.userId))
		.where(eq(passkeys.id, response.id));
	if (!row) throw new NotFoundError('Unknown passkey');
	if (row.user.isArchive) throw new ForbiddenError('This account cannot sign in.');

	const result = await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: rp.origin,
		expectedRPID: rp.id,
		credential: {
			id: row.passkey.id,
			publicKey: isoBase64URL.toBuffer(row.passkey.publicKey),
			counter: row.passkey.counter,
			transports: row.passkey.transports ?? undefined
		}
	}).catch(() => ({ verified: false as const, authenticationInfo: undefined }));
	if (!result.verified) throw new ForbiddenError('That passkey could not be verified.');

	await db
		.update(passkeys)
		.set({ counter: result.authenticationInfo.newCounter, lastUsedAt: new Date() })
		.where(eq(passkeys.id, row.passkey.id));
	return row.user;
}

export async function removePasskey(db: DB, userId: number, passkeyId: string): Promise<void> {
	const removed = await db
		.delete(passkeys)
		.where(and(eq(passkeys.id, passkeyId), eq(passkeys.userId, userId)))
		.returning({ id: passkeys.id });
	if (removed.length === 0) throw new NotFoundError('Passkey not found');
}
