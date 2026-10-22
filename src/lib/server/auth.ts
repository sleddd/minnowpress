import { error, redirect, type Cookies } from '@sveltejs/kit';
import { and, count, desc, eq, gt, lt, ne } from 'drizzle-orm';
import type { DB } from './db/client';
import { loginRequests, loginTokens, sessions, users, type User } from './db/schema';

export const SESSION_COOKIE = 'session';
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
export const LOGIN_TOKEN_TTL = 15 * MINUTE;
/** Every session ends this long after sign-in, however active it is. Never extended. */
export const SESSION_TTL = 2 * DAY;

export function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return Buffer.from(bytes).toString('base64url');
}

export async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Buffer.from(digest).toString('hex');
}

const HOUR = 60 * MINUTE;

/**
 * Sign-in link limits. Counting per network address means someone who knows your email can't
 * use up your links from their own connection; the per-email cap still protects the mail sender
 * if many addresses gang up on one inbox.
 */
export const LOGIN_LIMITS = {
	/** Links one network address can request for the same email, per 15 minutes. */
	perAddressAndEmail: 3,
	/** Links one network address can request in total, per hour. */
	perAddress: 10,
	/** Links one email can be sent from anywhere, per hour. */
	perEmail: 10
};

/**
 * Records a sign-in link request and says whether it's within the limits. The request is
 * recorded before it's counted, so a burst of parallel requests each sees the others and can't
 * slip under a limit they would each have passed alone. A refused request still counts.
 */
export async function allowLoginRequest(
	db: DB,
	request: { email: string; ip: string },
	now = new Date()
): Promise<boolean> {
	const hourAgo = new Date(now.getTime() - HOUR);
	await db.delete(loginRequests).where(lt(loginRequests.createdAt, hourAgo));
	await db.insert(loginRequests).values({ ...request, createdAt: now });
	const recent = (where: Parameters<typeof and>[0], since: Date) =>
		db
			.select({ n: count() })
			.from(loginRequests)
			.where(and(where, gt(loginRequests.createdAt, since)))
			.then(([r]) => r.n);
	const [both, address, email] = await Promise.all([
		recent(
			and(eq(loginRequests.ip, request.ip), eq(loginRequests.email, request.email)),
			new Date(now.getTime() - LOGIN_TOKEN_TTL)
		),
		recent(eq(loginRequests.ip, request.ip), hourAgo),
		recent(eq(loginRequests.email, request.email), hourAgo)
	]);
	return (
		both <= LOGIN_LIMITS.perAddressAndEmail &&
		address <= LOGIN_LIMITS.perAddress &&
		email <= LOGIN_LIMITS.perEmail
	);
}

/** Stores a hashed one-time login token for the email and returns the raw token for the link. */
export async function createLoginToken(db: DB, email: string, now = new Date()): Promise<string> {
	const token = generateToken();
	await db.delete(loginTokens).where(lt(loginTokens.expiresAt, now));
	await db.insert(loginTokens).values({
		tokenHash: await hashToken(token),
		email,
		expiresAt: new Date(now.getTime() + LOGIN_TOKEN_TTL)
	});
	return token;
}

/** The email a live token was issued for, without using it up; null if it's unknown or expired. */
export async function peekLoginToken(
	db: DB,
	token: string,
	now = new Date()
): Promise<string | null> {
	const row = await db.query.loginTokens.findFirst({
		where: and(eq(loginTokens.tokenHash, await hashToken(token)), gt(loginTokens.expiresAt, now))
	});
	return row?.email ?? null;
}

/** Returns the email the token was issued for, or null. A token works once. */
export async function consumeLoginToken(
	db: DB,
	token: string,
	now = new Date()
): Promise<string | null> {
	const [row] = await db
		.delete(loginTokens)
		.where(eq(loginTokens.tokenHash, await hashToken(token)))
		.returning();
	if (!row || row.expiresAt.getTime() <= now.getTime()) return null;
	return row.email;
}

export async function createSession(
	db: DB,
	userId: number,
	now = new Date(),
	userAgent: string | null = null
) {
	const token = generateToken();
	const expiresAt = new Date(now.getTime() + SESSION_TTL);
	await db.insert(sessions).values({
		id: await hashToken(token),
		userId,
		expiresAt,
		signedInAt: now,
		lastUsedAt: now,
		userAgent: userAgent?.slice(0, 300) ?? null
	});
	return { token, expiresAt };
}

/** "Last active" is only rewritten when it's this stale, so most requests don't write. */
const LAST_USED_GRANULARITY = 5 * MINUTE;

export async function validateSession(
	db: DB,
	token: string,
	now = new Date()
): Promise<{ user: User; expiresAt: Date; sessionId: string } | null> {
	const id = await hashToken(token);
	const [row] = await db
		.select({ user: users, expiresAt: sessions.expiresAt, lastUsedAt: sessions.lastUsedAt })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id));
	if (!row) return null;
	if (row.expiresAt.getTime() <= now.getTime() || row.user.suspendedAt) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	if (!row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > LAST_USED_GRANULARITY)
		await db.update(sessions).set({ lastUsedAt: now }).where(eq(sessions.id, id));
	return { user: row.user, expiresAt: row.expiresAt, sessionId: id };
}

/** The member's live sessions, most recently used first. Ids are the stored hashes, never tokens. */
export async function listSessions(db: DB, userId: number, now = new Date()) {
	return db
		.select({
			id: sessions.id,
			signedInAt: sessions.signedInAt,
			lastUsedAt: sessions.lastUsedAt,
			expiresAt: sessions.expiresAt,
			userAgent: sessions.userAgent
		})
		.from(sessions)
		.where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, now)))
		.orderBy(desc(sessions.lastUsedAt));
}

/** Signs out one of the member's own sessions. */
export async function revokeSession(db: DB, userId: number, sessionId: string): Promise<void> {
	await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
}

/** Signs out every session but the current one. */
export async function revokeOtherSessions(
	db: DB,
	userId: number,
	currentId: string
): Promise<void> {
	await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, currentId)));
}

export async function invalidateSession(db: DB, token: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, await hashToken(token)));
}

/** Creates a session for the user and sets the session cookie. */
export async function signIn(
	db: DB,
	cookies: Pick<Cookies, 'set'>,
	userId: number,
	secure: boolean,
	userAgent: string | null = null
): Promise<void> {
	const session = await createSession(db, userId, new Date(), userAgent);
	cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions(session.expiresAt, secure));
}

export function sessionCookieOptions(expiresAt: Date, secure: boolean) {
	return { path: '/', httpOnly: true, sameSite: 'lax' as const, secure, expires: expiresAt };
}

/**
 * Only allows same-site relative paths, so ?next= cannot redirect off-site. Browsers drop tabs
 * and newlines from URLs and read "\\" as "/", so "/\t/evil.com" would land on evil.com: any
 * control character or backslash makes the path unsafe.
 */
export function safeNext(next: string | null | undefined): string {
	// eslint-disable-next-line no-control-regex -- matching control characters is the point
	const unsafe = /[\u0000-\u001F\u007F\\]/;
	return next && next.startsWith('/') && !next.startsWith('//') && !unsafe.test(next) ? next : '/';
}

export function requireUser(user: User | null, url: URL): User {
	if (!user) redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	return user;
}

export function isModerator(user: User | null): boolean {
	return user?.role === 'mod' || user?.role === 'admin';
}

export function requireModerator(user: User | null): User {
	if (!user || !isModerator(user)) error(403, 'Moderators only');
	return user;
}

export function requireAdmin(user: User | null): User {
	if (!user || user.role !== 'admin') error(403, 'Admins only');
	return user;
}
