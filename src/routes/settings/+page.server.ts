import { fail } from '@sveltejs/kit';
import { listSessions, requireUser, revokeOtherSessions, revokeSession } from '#lib/server/auth.ts';
import { describeDevice } from '#lib/user-agent.ts';
import { db } from '#lib/server/db/index.ts';
import { formBool, formString, toActionFailure } from '#lib/server/forms.ts';
import { listPasskeys, removePasskey } from '#lib/server/passkeys.ts';
import { updateNotifications, updateProfile, updateTheme } from '#lib/server/users.ts';
import { parseTheme } from '#lib/theme.ts';
import type { Actions, PageServerLoad } from './$types';

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
		welcome: url.searchParams.has('welcome')
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
		try {
			// Refresh the signed-in user so the page rendered after this save shows the new values.
			locals.user = await updateProfile(db, user.id, values);
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
		locals.user = await updateTheme(db, user.id, theme);
		return { themeSaved: true };
	},

	notifications: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		locals.user = await updateNotifications(db, user.id, {
			notifyComments: formBool(data, 'notifyComments'),
			notifyContinuations: formBool(data, 'notifyContinuations'),
			notifyDigest: formBool(data, 'notifyDigest')
		});
		return { notificationsSaved: true };
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
