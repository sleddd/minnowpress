import { sample } from '#lib/sample.ts';
import { refreshActivityIfStale } from '#lib/server/activity.ts';
import { db } from '#lib/server/db/index.ts';
import { activeFeed, archiveChainsFeed } from '#lib/server/feeds.ts';
import { homeColumns } from '#lib/server/home.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 10;
/** Active's archive picks are a random few of the best-rated continued Ficly stories this many. */
const ARCHIVE_CHAINS_POOL = 60;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: COLUMN_SIZE };
	await refreshActivityIfStale(db);
	// Popular and Recent are shuffled the same way as on the home page.
	const [columns, active, tags] = await Promise.all([
		homeColumns(db, locals.user, COLUMN_SIZE),
		activeFeed(db, opts),
		popularTags(db, 20)
	]);
	// Until enough chains are growing here, Active is topped up with chains from the Ficly
	// archive, leaving out any already shown in another column.
	let picks: typeof active.items = [];
	if (active.items.length < COLUMN_SIZE) {
		const shown = new Set(
			[...columns.popular, ...columns.recent, ...active.items].map((s) => s.id)
		);
		const chains = await archiveChainsFeed(db, { ...opts, pageSize: ARCHIVE_CHAINS_POOL });
		picks = sample(
			chains.items.filter((s) => !shown.has(s.id)),
			COLUMN_SIZE - active.items.length
		);
	}
	return {
		...columns,
		active: [...active.items, ...picks],
		activeHasArchivePicks: picks.length > 0,
		tags: tags.map((t) => t.name)
	};
};
