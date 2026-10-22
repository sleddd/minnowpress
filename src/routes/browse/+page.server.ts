import { refreshActivityIfStale } from '#lib/server/activity.ts';
import { db } from '#lib/server/db/index.ts';
import { activeFeed, latestFeed, popularFeed } from '#lib/server/feeds.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 10;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: COLUMN_SIZE };
	await refreshActivityIfStale(db);
	const [popular, active, recent, tags] = await Promise.all([
		popularFeed(db, opts),
		activeFeed(db, opts),
		latestFeed(db, opts),
		popularTags(db, 20)
	]);
	return {
		popular: popular.items,
		active: active.items,
		recent: recent.items,
		tags: tags.map((t) => t.name)
	};
};
