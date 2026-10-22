import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DB } from './db/client';
import { passkeys, users } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { createTestDb, makeUser } from './testing/db';

// Real option generation; verification is mocked because it needs a real authenticator's signatures.
const verifyRegistrationResponse = vi.fn();
const verifyAuthenticationResponse = vi.fn();
vi.mock('@simplewebauthn/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@simplewebauthn/server')>()),
	verifyRegistrationResponse: (...args: unknown[]) => verifyRegistrationResponse(...args),
	verifyAuthenticationResponse: (...args: unknown[]) => verifyAuthenticationResponse(...args)
}));

const {
	authenticationOptions,
	finishAuthentication,
	finishRegistration,
	listPasskeys,
	registrationOptions,
	relyingParty,
	removePasskey
} = await import('./passkeys');

const rp = relyingParty('https://minnow.test', 'MinnowPress');
let db: DB;
let user: Awaited<ReturnType<typeof makeUser>>;

const registered = (id = 'cred-1') => ({
	verified: true,
	registrationInfo: {
		credential: { id, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] }
	}
});

beforeEach(async () => {
	db = await createTestDb();
	user = await makeUser(db, { username: 'jane', displayName: 'Jane' });
	verifyRegistrationResponse.mockReset();
	verifyAuthenticationResponse.mockReset();
});

describe('relyingParty', () => {
	it('derives the id and origin from the site origin', () => {
		expect(relyingParty('https://minnowpress.com/some/path', 'M')).toEqual({
			id: 'minnowpress.com',
			name: 'M',
			origin: 'https://minnowpress.com'
		});
	});
});

describe('registration', () => {
	it('generates options for the user and excludes passkeys they already have', async () => {
		verifyRegistrationResponse.mockResolvedValue(registered());
		await finishRegistration(db, user, {} as never, 'chal', rp);
		const options = await registrationOptions(db, user, rp);
		expect(options.rp).toEqual({ id: 'minnow.test', name: 'MinnowPress' });
		expect(options.user.name).toBe('jane');
		expect(options.authenticatorSelection?.residentKey).toBe('required');
		expect(options.excludeCredentials?.map((c) => c.id)).toEqual(['cred-1']);
		expect(typeof options.challenge).toBe('string');
	});

	it('stores a verified passkey and checks the expected challenge, origin, and rp', async () => {
		verifyRegistrationResponse.mockResolvedValue(registered());
		const passkey = await finishRegistration(
			db,
			user,
			{ id: 'x' } as never,
			'chal',
			rp,
			'  MacBook  '
		);
		expect(passkey).toMatchObject({
			id: 'cred-1',
			userId: user.id,
			name: 'MacBook',
			counter: 0,
			transports: ['internal']
		});
		expect(passkey.publicKey).toBe('AQID');
		expect(verifyRegistrationResponse).toHaveBeenCalledWith(
			expect.objectContaining({
				expectedChallenge: 'chal',
				expectedOrigin: 'https://minnow.test',
				expectedRPID: 'minnow.test'
			})
		);
		expect(await listPasskeys(db, user.id)).toMatchObject([{ id: 'cred-1', name: 'MacBook' }]);
	});

	it('defaults the name and rejects unverified or failing responses', async () => {
		verifyRegistrationResponse.mockResolvedValueOnce(registered('c2'));
		expect((await finishRegistration(db, user, {} as never, 'c', rp, '   ')).name).toBe('Passkey');
		verifyRegistrationResponse.mockResolvedValueOnce({ verified: false });
		await expect(finishRegistration(db, user, {} as never, 'c', rp)).rejects.toThrow(
			ValidationError
		);
		verifyRegistrationResponse.mockRejectedValueOnce(new Error('bad attestation'));
		await expect(finishRegistration(db, user, {} as never, 'c', rp)).rejects.toThrow(
			ValidationError
		);
	});
});

describe('authentication', () => {
	beforeEach(async () => {
		verifyRegistrationResponse.mockResolvedValue(registered());
		await finishRegistration(db, user, {} as never, 'chal', rp);
	});

	it('generates discoverable-credential options', async () => {
		const options = await authenticationOptions(rp);
		expect(options.rpId).toBe('minnow.test');
		expect(options.allowCredentials ?? []).toEqual([]);
	});

	it('signs in the passkey owner and updates the counter', async () => {
		verifyAuthenticationResponse.mockResolvedValue({
			verified: true,
			authenticationInfo: { newCounter: 7 }
		});
		const signedIn = await finishAuthentication(db, { id: 'cred-1' } as never, 'chal', rp);
		expect(signedIn.id).toBe(user.id);
		const credential = verifyAuthenticationResponse.mock.calls[0][0].credential;
		expect(Array.from(credential.publicKey)).toEqual([1, 2, 3]);
		const [row] = await db.select().from(passkeys).where(eq(passkeys.id, 'cred-1'));
		expect(row.counter).toBe(7);
		expect(row.lastUsedAt).toBeInstanceOf(Date);
	});

	it('rejects unknown, unverified, failing, and archive passkeys', async () => {
		await expect(finishAuthentication(db, { id: 'nope' } as never, 'c', rp)).rejects.toThrow(
			NotFoundError
		);
		verifyAuthenticationResponse.mockResolvedValueOnce({ verified: false });
		await expect(finishAuthentication(db, { id: 'cred-1' } as never, 'c', rp)).rejects.toThrow(
			ForbiddenError
		);
		verifyAuthenticationResponse.mockRejectedValueOnce(new Error('bad signature'));
		await expect(finishAuthentication(db, { id: 'cred-1' } as never, 'c', rp)).rejects.toThrow(
			ForbiddenError
		);
		await db.update(users).set({ isArchive: true }).where(eq(users.id, user.id));
		await expect(finishAuthentication(db, { id: 'cred-1' } as never, 'c', rp)).rejects.toThrow(
			ForbiddenError
		);
	});
});

describe('removePasskey', () => {
	it('removes only your own passkeys', async () => {
		verifyRegistrationResponse.mockResolvedValue(registered());
		await finishRegistration(db, user, {} as never, 'chal', rp);
		const other = await makeUser(db);
		await expect(removePasskey(db, other.id, 'cred-1')).rejects.toThrow(NotFoundError);
		await removePasskey(db, user.id, 'cred-1');
		expect(await listPasskeys(db, user.id)).toEqual([]);
	});
});
