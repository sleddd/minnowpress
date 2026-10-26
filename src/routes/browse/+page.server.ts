import { sample } from '#lib/sample.ts';
import { refreshActivityIfStale } from '#lib/server/activity.ts';
import { db } from '#lib/server/db/index.ts';
import { activeFeed, archiveChainsFeed, latestFeed, popularFeed } from '#lib/server/feeds.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 10;
/** Active's archive picks are a random few of the best-rated continued Ficly stories this many. */
const ARCHIVE_CHAINS_POOL = 60;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: COLUMN_SIZE };
	await refreshActivityIfStale(db);
	const [popular, active, recent, tags] = await Promise.all([
		popularFeed(db, opts),
		activeFeed(db, opts),
		latestFeed(db, opts),
		popularTags(db, 20)
	]);
	// Until enough chains are growing here, Active is topped up with chains from the Ficly
	// archive, leaving out any already under Popular or Active.
	let picks: typeof active.items = [];
	if (active.items.length < COLUMN_SIZE) {
		const shown = new Set([...popular.items, ...active.items].map((s) => s.id));
		const chains = await archiveChainsFeed(db, { ...opts, pageSize: ARCHIVE_CHAINS_POOL });
		picks = sample(
			chains.items.filter((s) => !shown.has(s.id)),
			COLUMN_SIZE - active.items.length
		);
	}
	return {
		popular: popular.items,
		active: [...active.items, ...picks],
		activeHasArchivePicks: picks.length > 0,
		recent: recent.items,
		tags: tags.map((t) => t.name)
	};
};
