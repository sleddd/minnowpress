import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { createTestDb, makeUser } from './testing/db';
import {
	ADULT_REQUIRED,
	confirmAdult,
	findOrCreateUserByEmail,
	getUserById,
	getUserByUsername,
	isValidEmail,
	normalizeEmail,
	normalizeWebsite,
	suggestUsername,
	usernameTaken,
	USERNAME_HOLD_DAYS,
	EMAIL_MAX,
	updateNotifications,
	updateTheme,
	updateProfile,
	type ProfileInput
} from './users';

let db: DB;
beforeEach(async () => {
	db = await createTestDb();
});

describe('email helpers', () => {
	it('normalizes and validates emails', () => {
		expect(normalizeEmail('  Jane@Example.COM ')).toBe('jane@example.com');
		expect(isValidEmail('jane@example.com')).toBe(true);
		expect(isValidEmail('jane@localhost')).toBe(false);
		expect(isValidEmail('not an email')).toBe(false);
		expect(isValidEmail(`${'a'.repeat(EMAIL_MAX - 12)}@example.com`)).toBe(true);
		expect(isValidEmail(`${'a'.repeat(EMAIL_MAX)}@example.com`)).toBe(false);
	});
});

describe('suggestUsername', () => {
	it('derives from the local part and de-duplicates', async () => {
		expect(await suggestUsername(db, 'Jane.Doe+fic@example.com')).toBe('jane_doe_fic');
		await makeUser(db, { username: 'jane' });
		expect(await suggestUsername(db, 'jane@example.com')).toBe('jane2');
	});

	it('pads very short names', async () => {
		expect(await suggestUsername(db, 'j@example.com')).toBe('writerj');
	});
});

describe('findOrCreateUserByEmail', () => {
	it('creates once, then finds the same user', async () => {
		const first = await findOrCreateUserByEmail(db, 'New@Example.com');
		const second = await findOrCreateUserByEmail(db, 'new@example.com');
		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
		expect(second.user.id).toBe(first.user.id);
		expect(first.user.role).toBe('user');
		expect(first.user.email).toBe('new@example.com');
	});

	it('makes configured emails admins', async () => {
		const { user } = await findOrCreateUserByEmail(db, 'boss@example.com', {
			adminEmails: ['boss@example.com']
		});
		expect(user.role).toBe('admin');
	});
});

describe('lookups', () => {
	it('finds users by id and case-insensitive username', async () => {
		const u = await makeUser(db, { username: 'jane' });
		expect((await getUserById(db, u.id))?.id).toBe(u.id);
		expect((await getUserByUsername(db, 'JANE'))?.id).toBe(u.id);
		expect(await getUserById(db, 9999)).toBeNull();
		expect(await getUserByUsername(db, 'nobody')).toBeNull();
	});
});

describe('normalizeWebsite', () => {
	it('adds https, allows empty, rejects junk', () => {
		expect(normalizeWebsite('example.com')).toBe('https://example.com/');
		expect(normalizeWebsite('http://a.b/c')).toBe('http://a.b/c');
		expect(normalizeWebsite('  ')).toBeNull();
		expect(normalizeWebsite('localhost')).toBeUndefined();
		expect(normalizeWebsite('http://')).toBeUndefined();
	});
});

describe('confirmAdult', () => {
	it('records the confirmation once and asks nothing after', async () => {
		const u = await makeUser(db);
		await expect(confirmAdult(db, u, false, 'write')).rejects.toMatchObject({
			fields: { adultConfirmed: ADULT_REQUIRED.write }
		});
		const now = new Date('2026-10-23T12:00:00Z');
		await confirmAdult(db, u, true, 'write', now);
		const confirmed = (await getUserById(db, u.id))!;
		expect(confirmed.adultConfirmedAt).toEqual(now);
		await expect(confirmAdult(db, confirmed, false, 'read')).resolves.toBeUndefined();
	});
});

describe('updateProfile', () => {
	const profile = (o: Partial<ProfileInput> = {}): ProfileInput => ({
		username: 'jane',
		displayName: 'Jane',
		bio: 'I write.',
		website: '',
		showMature: false,
		...o
	});

	it('turns mature stories on only for members who confirm they’re 18 or older', async () => {
		const u = await makeUser(db);
		await expect(updateProfile(db, u.id, profile({ showMature: true }))).rejects.toMatchObject({
			fields: { adultConfirmed: ADULT_REQUIRED.read }
		});
		const saved = await updateProfile(
			db,
			u.id,
			profile({ showMature: true, adultConfirmed: true })
		);
		expect(saved.adultConfirmedAt).toBeInstanceOf(Date);
		// Once confirmed, turning it off and on again asks nothing more.
		await updateProfile(db, u.id, profile({ showMature: false }));
		expect((await updateProfile(db, u.id, profile({ showMature: true }))).showMature).toBe(true);
	});

	it('saves a valid profile', async () => {
		const u = await makeUser(db);
		const updated = await updateProfile(
			db,
			u.id,
			profile({ username: 'Jane', website: 'jane.dev', showMature: true, adultConfirmed: true })
		);
		expect(updated).toMatchObject({
			username: 'jane',
			displayName: 'Jane',
			website: 'https://jane.dev/',
			showMature: true
		});
	});

	it('refuses reserved usernames, but lets someone who has one keep it', async () => {
		const u = await makeUser(db);
		const err = await updateProfile(db, u.id, profile({ username: 'Admin' })).catch((e) => e);
		expect(err.fields).toEqual({ username: 'That username is reserved.' });
		const old = await makeUser(db, { username: 'support' });
		await expect(
			updateProfile(db, old.id, profile({ username: 'support' }))
		).resolves.toMatchObject({ username: 'support' });
	});

	it('keeps your own username without a conflict', async () => {
		const u = await makeUser(db, { username: 'jane' });
		await expect(updateProfile(db, u.id, profile())).resolves.toMatchObject({ username: 'jane' });
	});

	it('reports each invalid field', async () => {
		await makeUser(db, { username: 'taken' });
		const u = await makeUser(db);
		const err = await updateProfile(
			db,
			u.id,
			profile({ username: 'taken', displayName: '', bio: 'x'.repeat(501), website: 'nope' })
		).catch((e) => e);
		expect(err).toBeInstanceOf(ValidationError);
		expect(Object.keys(err.fields).sort()).toEqual(['bio', 'displayName', 'username', 'website']);
	});

	it('rejects malformed usernames and long display names', async () => {
		const u = await makeUser(db);
		const err = await updateProfile(
			db,
			u.id,
			profile({ username: 'no spaces', displayName: 'x'.repeat(51) })
		).catch((e) => e);
		expect(Object.keys(err.fields).sort()).toEqual(['displayName', 'username']);
	});
});

describe('username hold', () => {
	const DAY = 24 * 60 * 60 * 1000;
	const now = new Date('2026-10-22T12:00:00Z');
	const profile = (username: string): ProfileInput => ({
		username,
		displayName: 'Jane',
		bio: '',
		website: '',
		showMature: false
	});

	it('keeps a given-up name off the market for a while', async () => {
		const jane = await makeUser(db, { username: 'jane' });
		const other = await makeUser(db);
		const renamed = await updateProfile(db, jane.id, profile('janet'), now);
		expect(renamed).toMatchObject({
			username: 'janet',
			formerUsername: 'jane',
			usernameChangedAt: now
		});
		// Nobody else can take it yet, and sign-up won't suggest it.
		const err = await updateProfile(db, other.id, profile('jane'), now).catch((e) => e);
		expect(err).toBeInstanceOf(ValidationError);
		expect(err.fields.username).toBe('That username is taken.');
		expect(await suggestUsername(db, 'jane@example.com')).toBe('jane2');
		// Jane can take her own old name back.
		expect((await updateProfile(db, jane.id, profile('jane'), now)).username).toBe('jane');
		await updateProfile(db, jane.id, profile('janet'), now);
		// After the hold, it's free.
		const later = new Date(now.getTime() + (USERNAME_HOLD_DAYS + 1) * DAY);
		expect(await usernameTaken(db, 'jane', { now: later })).toBe(false);
		expect((await updateProfile(db, other.id, profile('jane'), later)).username).toBe('jane');
	});

	it('does not record a rename when the name is unchanged', async () => {
		const jane = await makeUser(db, { username: 'jane' });
		const same = await updateProfile(db, jane.id, profile('Jane'), now);
		expect(same.formerUsername).toBeNull();
		expect(same.usernameChangedAt).toBeNull();
	});
});

describe('reserved usernames', () => {
	it('are never suggested at sign-up', async () => {
		expect(await suggestUsername(db, 'admin@example.com')).toBe('admin2');
	});
});

describe('suspended account', () => {
	it('cannot sign in', async () => {
		await makeUser(db, { email: 'spam@example.com', suspendedAt: new Date() });
		await expect(findOrCreateUserByEmail(db, 'spam@example.com')).rejects.toThrow(ForbiddenError);
	});
});

describe('archive account', () => {
	it('cannot sign in', async () => {
		await makeUser(db, { email: 'archive@ficly.invalid', isArchive: true });
		await expect(findOrCreateUserByEmail(db, 'archive@ficly.invalid')).rejects.toThrow(
			ForbiddenError
		);
	});
});

describe('updateTheme', () => {
	it('saves the color theme, defaulting to light', async () => {
		const user = await makeUser(db);
		expect(user.theme).toBe('light');
		expect((await updateTheme(db, user.id, 'dark')).theme).toBe('dark');
		await expect(updateTheme(db, 9999, 'light')).rejects.toThrow(NotFoundError);
	});
});

describe('updateNotifications', () => {
	it('saves email preferences', async () => {
		const u = await makeUser(db);
		expect(u).toMatchObject({
			notifyComments: true,
			notifyContinuations: true,
			notifyDigest: false
		});
		const updated = await updateNotifications(db, u.id, {
			notifyComments: false,
			notifyContinuations: true,
			notifyDigest: true
		});
		expect(updated).toMatchObject({
			notifyComments: false,
			notifyContinuations: true,
			notifyDigest: true
		});
	});

	it('404s for a missing user', async () => {
		await expect(
			updateNotifications(db, 999, {
				notifyComments: true,
				notifyContinuations: true,
				notifyDigest: true
			})
		).rejects.toThrow(NotFoundError);
	});
});
