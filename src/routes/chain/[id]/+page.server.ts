import { error } from '@sveltejs/kit';
import { buildChainTree } from '#lib/chain.ts';
import { db } from '#lib/server/db/index.ts';
import { paramInt } from '#lib/server/forms.ts';
import { getChain } from '#lib/server/stories.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const stories = await getChain(db, paramInt(params.id));
	if (stories.length === 0) error(404, 'Chain not found');
	const from = Number(url.searchParams.get('from')) || null;
	return {
		nodes: buildChainTree(stories),
		count: stories.length,
		root: stories[0],
		currentId: from
	};
};
