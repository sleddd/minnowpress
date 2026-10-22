import { db } from '#lib/server/db/index.ts';
import { tagFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const tag = params.tag.toLowerCase();
	const feed = await tagFeed(db, tag, {
		viewer: locals.user,
		page: Number(url.searchParams.get('page')) || 1
	});
	return { tag, feed };
};
