import { error, redirect } from '@sveltejs/kit';
import { isModerator, requireModerator } from '#lib/server/auth.ts';
import { countEntries, getChallenge, removeChallenge } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { challengeFeed } from '#lib/server/feeds.ts';
import { pageParam, paramInt } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = paramInt(params.id);
	const challenge = await getChallenge(db, id);
	if (!challenge) error(404, 'Challenge not found');
	const feed = await challengeFeed(db, id, {
		viewer: locals.user,
		page: pageParam(url.searchParams.get('page'))
	});
	return {
		challenge: { ...challenge, entries: await countEntries(db, id) },
		feed,
		isModerator: isModerator(locals.user)
	};
};

export const actions: Actions = {
	remove: async ({ params, locals }) => {
		const mod = requireModerator(locals.user);
		await removeChallenge(db, paramInt(params.id), mod.id);
		redirect(303, '/challenges');
	}
};
