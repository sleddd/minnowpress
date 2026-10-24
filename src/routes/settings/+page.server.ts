import { fail } from '@sveltejs/kit';
import { listSessions, requireUser, revokeOtherSessions, revokeSession } from '#lib/server/auth.ts';
import { describeDevice } from '#lib/user-agent.ts';
import { db } from '#lib/server/db/index.ts';
import { formBool, formString, toActionFailure } from '#lib/server/forms.ts';
import { listPasskeys, removePasskey } from '#lib/server/passkeys.ts';
import {
	disableTwoFactor,
	enableTwoFactor,
	otpauthUri,
	pendingSecret,
	qrDataUrl,
	recoveryCodesLeft,
	twoFactorMessage
} from '#lib/server/two-factor.ts';
import { getUserById, updateNotifications, updateProfile, updateTheme } from '#lib/server/users.ts';
import { parseTheme } from '#lib/theme.ts';
import type { User } from '#lib/server/db/schema.ts';
import type { Actions, PageServerLoad } from './$types';

/** The stored account: locals.user has staff powers switched off until two-step sign-in. */
async function stored(user: User): Promise<User> {
	return (await getUserById(db, user.id)) ?? user;
}

/** What the two-step section shows: nothing for members; setup, locked, or on for staff. */
async function twoFactorState(user: User, lock: App.Locals['staffLock']) {
	if (user.role === 'user') return null;
	if (!user.totpEnabledAt) {
		const secret = await pendingSecret(db, user);
		return { state: 'setup' as const, secret, qr: await qrDataUrl(otpauthUri(secret, user.email)) };
	}
	if (lock === 'verify') return { state: 'locked' as const };
	return { state: 'on' as const, recoveryLeft: await recoveryCodesLeft(db, user.id) };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	return {
		values: {
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			website: user.website ?? '',
			showMature: user.showMature
		},
		adultConfirmed: user.adultConfirmedAt !== null,
		prefs: {
			notifyComments: user.notifyComments,
			notifyContinuations: user.notifyContinuations,
			notifyDigest: user.notifyDigest
		},
		theme: user.theme,
		passkeys: await listPasskeys(db, user.id),
		sessions: (await listSessions(db, user.id)).map((s) => ({
			id: s.id,
			device: describeDevice(s.userAgent),
			signedInAt: s.signedInAt,
			lastUsedAt: s.lastUsedAt,
			expiresAt: s.expiresAt,
			current: s.id === locals.sessionId
		})),
		welcome: url.searchParams.has('welcome'),
		twoFactor: await twoFactorState(await stored(user), locals.staffLock)
	};
};

export const actions: Actions = {
	profile: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		const values = {
			username: formString(data, 'username'),
			displayName: formString(data, 'displayName'),
			bio: formString(data, 'bio'),
			website: formString(data, 'website'),
			showMature: formBool(data, 'showMature')
		};
		const adultConfirmed = formBool(data, 'adultConfirmed');
		try {
			// Refresh the signed-in user so the page rendered after this save shows the new values.
			// Keep staff powers as the request hook set them (off until two-step sign-in).
			locals.user = {
				...(await updateProfile(db, user.id, { ...values, adultConfirmed })),
				role: user.role
			};
			return { saved: true };
		} catch (e) {
			return toActionFailure(e, { values });
		}
	},

	revokeSession: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const sessionId = formString(await request.formData(), 'sessionId');
		if (!sessionId || sessionId === locals.sessionId) return fail(400);
		await revokeSession(db, user.id, sessionId);
		return { sessionsRevoked: true };
	},

	revokeOtherSessions: async ({ locals, url }) => {
		const user = requireUser(locals.user, url);
		if (!locals.sessionId) return fail(400);
		await revokeOtherSessions(db, user.id, locals.sessionId);
		return { sessionsRevoked: true };
	},

	theme: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const theme = parseTheme(formString(await request.formData(), 'theme'));
		locals.user = { ...(await updateTheme(db, user.id, theme)), role: user.role };
		return { themeSaved: true };
	},

	notifications: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		locals.user = {
			...(await updateNotifications(db, user.id, {
				notifyComments: formBool(data, 'notifyComments'),
				notifyContinuations: formBool(data, 'notifyContinuations'),
				notifyDigest: formBool(data, 'notifyDigest')
			})),
			// Keep staff powers as the request hook set them.
			role: user.role
		};
		return { notificationsSaved: true };
	},

	enableTwoFactor: async ({ locals, url, request }) => {
		const user = await stored(requireUser(locals.user, url));
		if (!locals.sessionId) return fail(400);
		try {
			const codes = await enableTwoFactor(
				db,
				user,
				locals.sessionId,
				formString(await request.formData(), 'code')
			);
			return { recoveryCodes: codes };
		} catch (e) {
			const message = twoFactorMessage(e);
			if (message === null) throw e;
			return fail(400, { twoFactorError: message });
		}
	},

	disableTwoFactor: async ({ locals, url, request }) => {
		const user = await stored(requireUser(locals.user, url));
		// Only from a sign-in that already passed the step.
		if (locals.staffLock !== null) return fail(403);
		try {
			await disableTwoFactor(db, user, formString(await request.formData(), 'code'));
			return { twoFactorOff: true };
		} catch (e) {
			const message = twoFactorMessage(e);
			if (message === null) throw e;
			return fail(400, { twoFactorError: message });
		}
	},

	removePasskey: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const id = formString(await request.formData(), 'id');
		if (!id) return fail(400);
		try {
			await removePasskey(db, user.id, id);
		} catch (e) {
			return toActionFailure(e);
		}
	}
};
