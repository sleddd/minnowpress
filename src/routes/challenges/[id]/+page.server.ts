import { error } from '@sveltejs/kit';
import { countEntries, getChallenge } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { challengeFeed } from '#lib/server/feeds.ts';
import { paramInt } from '#lib/server/forms.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = paramInt(params.id);
	const challenge = await getChallenge(db, id);
	if (!challenge) error(404, 'Challenge not found');
	const feed = await challengeFeed(db, id, {
		viewer: locals.user,
		page: Number(url.searchParams.get('page')) || 1
	});
	return { challenge: { ...challenge, entries: await countEntries(db, id) }, feed };
};
