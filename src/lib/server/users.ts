import { and, eq, gt, ne, or } from 'drizzle-orm';
import type { Theme } from '#lib/theme.ts';
import { countGraphemes, RESERVED_USERNAMES, validateUsername } from '#lib/text.ts';
import type { DB } from './db/client';
import { users, type User } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 500;
/** The longest address mail systems accept (RFC 5321). */
export const EMAIL_MAX = 254;
/**
 * How long a username someone gave up stays off the market, so links and mentions sent out
 * under the old name don't start pointing at a stranger the next day.
 */
export const USERNAME_HOLD_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** True when someone else holds the name, or gave it up less than USERNAME_HOLD_DAYS ago. */
export async function usernameTaken(
	db: DB,
	name: string,
	opts: { except?: number; now?: Date } = {}
): Promise<boolean> {
	const now = opts.now ?? new Date();
	const held = and(
		eq(users.formerUsername, name),
		gt(users.usernameChangedAt, new Date(now.getTime() - USERNAME_HOLD_DAYS * DAY))
	);
	const row = await db.query.users.findFirst({
		where: and(
			or(eq(users.username, name), held),
			opts.except === undefined ? undefined : ne(users.id, opts.except)
		)
	});
	return Boolean(row);
}

/** A username derived from the email's local part, made unique with a number if needed. */
export async function suggestUsername(db: DB, email: string): Promise<string> {
	let base = email
		.split('@')[0]
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 16);
	if (base.length < 3) base = `writer${base}`;
	let candidate = base;
	const taken = async (name: string) =>
		RESERVED_USERNAMES.has(name) || (await usernameTaken(db, name));
	for (let n = 2; await taken(candidate); n++) {
		candidate = `${base}${n}`;
	}
	return candidate;
}

export async function findOrCreateUserByEmail(
	db: DB,
	rawEmail: string,
	opts: { adminEmails?: string[]; referralCode?: string | null } = {}
): Promise<{ user: User; created: boolean }> {
	const email = normalizeEmail(rawEmail);
	const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
	if (existing?.isArchive || existing?.suspendedAt)
		throw new ForbiddenError('This account cannot sign in.');
	if (existing) return { user: existing, created: false };

	const username = await suggestUsername(db, email);
	const [user] = await db
		.insert(users)
		.values({
			email,
			username,
			displayName: username,
			role: opts.adminEmails?.includes(email) ? 'admin' : 'user',
			referralCode: opts.referralCode ?? null
		})
		.returning();
	return { user, created: true };
}

export async function getUserById(db: DB, id: number): Promise<User | null> {
	return (await db.query.users.findFirst({ where: eq(users.id, id) })) ?? null;
}

export async function getUserByUsername(db: DB, username: string): Promise<User | null> {
	return (
		(await db.query.users.findFirst({ where: eq(users.username, username.toLowerCase()) })) ?? null
	);
}

export interface ProfileInput {
	username: string;
	displayName: string;
	bio: string;
	website: string;
	showMature: boolean;
	/** Ticked "I'm 18 or older"; needed once, to turn mature stories on. */
	adultConfirmed?: boolean;
}

export const ADULT_REQUIRED = {
	read: 'Confirm you’re 18 or older to see mature stories.',
	write: 'Confirm you’re 18 or older to post a mature story.'
};

/**
 * Mature stories, to read or to write, are for adults. A member confirms it once; the date is
 * kept, and they aren't asked again. Throws unless they have confirmed, now or before.
 */
export async function confirmAdult(
	db: DB,
	user: Pick<User, 'id' | 'adultConfirmedAt'>,
	confirmed: boolean,
	purpose: keyof typeof ADULT_REQUIRED,
	now = new Date()
): Promise<void> {
	if (user.adultConfirmedAt) return;
	if (!confirmed) throw new ValidationError({ adultConfirmed: ADULT_REQUIRED[purpose] });
	await db.update(users).set({ adultConfirmedAt: now }).where(eq(users.id, user.id));
}

/** "" → null (no website); a valid http(s) address → its URL; anything else → undefined (invalid). */
export function normalizeWebsite(website: string): string | null | undefined {
	const trimmed = website.trim();
	if (!trimmed) return null;
	const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		const url = new URL(withScheme);
		return url.hostname.includes('.') ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

export async function updateProfile(
	db: DB,
	userId: number,
	input: ProfileInput,
	now = new Date()
): Promise<User> {
	const errors: Record<string, string> = {};
	const username = input.username.trim().toLowerCase();
	const usernameError = validateUsername(username);
	const current = await getUserById(db, userId);
	if (usernameError) errors.username = usernameError;
	// Someone who already has a reserved name keeps it; nobody new can take one.
	else if (RESERVED_USERNAMES.has(username) && current?.username !== username)
		errors.username = 'That username is reserved.';
	else if (await usernameTaken(db, username, { except: userId, now }))
		errors.username = 'That username is taken.';
	const displayLength = countGraphemes(input.displayName.trim(), DISPLAY_NAME_MAX);
	if (displayLength === 0) errors.displayName = 'Enter a display name.';
	else if (displayLength > DISPLAY_NAME_MAX)
		errors.displayName = `Up to ${DISPLAY_NAME_MAX} characters.`;
	if (countGraphemes(input.bio.trim(), BIO_MAX) > BIO_MAX)
		errors.bio = `Bios are ${BIO_MAX} characters or less.`;
	const website = normalizeWebsite(input.website);
	if (website === undefined) errors.website = 'Enter a valid web address.';
	const confirmingAdult = input.showMature && !current?.adultConfirmedAt;
	if (confirmingAdult && !input.adultConfirmed) errors.adultConfirmed = ADULT_REQUIRED.read;
	if (Object.keys(errors).length) throw new ValidationError(errors);

	// A rename holds the old name for a while (see USERNAME_HOLD_DAYS).
	const renamed = current !== null && current.username !== username;
	const [user] = await db
		.update(users)
		.set({
			username,
			displayName: input.displayName.trim(),
			bio: input.bio.trim(),
			website,
			showMature: input.showMature,
			...(confirmingAdult ? { adultConfirmedAt: now } : {}),
			...(renamed ? { formerUsername: current.username, usernameChangedAt: now } : {})
		})
		.where(eq(users.id, userId))
		.returning();
	if (!user) throw new NotFoundError('User not found');
	return user;
}

export async function updateTheme(db: DB, userId: number, theme: Theme): Promise<User> {
	const [user] = await db.update(users).set({ theme }).where(eq(users.id, userId)).returning();
	if (!user) throw new NotFoundError('User not found');
	return user;
}

export interface NotificationPrefs {
	notifyComments: boolean;
	notifyContinuations: boolean;
	notifyDigest: boolean;
}

export async function updateNotifications(
	db: DB,
	userId: number,
	prefs: NotificationPrefs
): Promise<User> {
	const [user] = await db.update(users).set(prefs).where(eq(users.id, userId)).returning();
	if (!user) throw new NotFoundError('User not found');
	return user;
}
