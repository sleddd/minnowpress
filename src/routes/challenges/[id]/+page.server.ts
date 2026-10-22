import { error } from '@sveltejs/kit';
import { countEntries, getChallenge } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { challengeFeed } from '#lib/server/feeds.ts';
import { pageParam, paramInt } from '#lib/server/forms.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const id = paramInt(params.id);
	const challenge = await getChallenge(db, id);
	if (!challenge) error(404, 'Challenge not found');
	const feed = await challengeFeed(db, id, {
		viewer: locals.user,
		page: pageParam(url.searchParams.get('page'))
	});
	return { challenge: { ...challenge, entries: await countEntries(db, id) }, feed };
};
