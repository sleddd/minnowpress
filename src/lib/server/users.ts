import { and, eq, ne } from 'drizzle-orm';
import type { Theme } from '#lib/theme.ts';
import { countGraphemes, validateUsername } from '#lib/text.ts';
import type { DB } from './db/client';
import { users, type User } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 500;

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
	for (let n = 2; await db.query.users.findFirst({ where: eq(users.username, candidate) }); n++) {
		candidate = `${base}${n}`;
	}
	return candidate;
}

export async function findOrCreateUserByEmail(
	db: DB,
	rawEmail: string,
	opts: { adminEmails?: string[] } = {}
): Promise<{ user: User; created: boolean }> {
	const email = normalizeEmail(rawEmail);
	const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
	if (existing?.isArchive) throw new ForbiddenError('This account cannot sign in.');
	if (existing) return { user: existing, created: false };

	const username = await suggestUsername(db, email);
	const [user] = await db
		.insert(users)
		.values({
			email,
			username,
			displayName: username,
			role: opts.adminEmails?.includes(email) ? 'admin' : 'user'
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

export async function updateProfile(db: DB, userId: number, input: ProfileInput): Promise<User> {
	const errors: Record<string, string> = {};
	const username = input.username.trim().toLowerCase();
	const usernameError = validateUsername(username);
	if (usernameError) errors.username = usernameError;
	else {
		const taken = await db.query.users.findFirst({
			where: and(eq(users.username, username), ne(users.id, userId))
		});
		if (taken) errors.username = 'That username is taken.';
	}
	const displayLength = countGraphemes(input.displayName.trim());
	if (displayLength === 0) errors.displayName = 'Enter a display name.';
	else if (displayLength > DISPLAY_NAME_MAX)
		errors.displayName = `Up to ${DISPLAY_NAME_MAX} characters.`;
	if (countGraphemes(input.bio.trim()) > BIO_MAX)
		errors.bio = `Bios are ${BIO_MAX} characters or less.`;
	const website = normalizeWebsite(input.website);
	if (website === undefined) errors.website = 'Enter a valid web address.';
	if (Object.keys(errors).length) throw new ValidationError(errors);

	const [user] = await db
		.update(users)
		.set({
			username,
			displayName: input.displayName.trim(),
			bio: input.bio.trim(),
			website,
			showMature: input.showMature
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
