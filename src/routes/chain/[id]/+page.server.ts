import { error } from '@sveltejs/kit';
import { buildChainTree } from '#lib/chain.ts';
import { db } from '#lib/server/db/index.ts';
import { paramInt, queryInt } from '#lib/server/forms.ts';
import { getChain } from '#lib/server/stories.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const stories = await getChain(db, paramInt(params.id), {
		showMature: locals.user?.showMature
	});
	if (stories.length === 0) error(404, 'Chain not found');
	const from = queryInt(url.searchParams.get('from'));
	return {
		nodes: buildChainTree(stories),
		count: stories.length,
		root: stories[0],
		currentId: from
	};
};
