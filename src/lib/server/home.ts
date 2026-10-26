import { sample } from '#lib/sample.ts';
import type { DB } from './db/client';
import { memberFeed, popularFeed, type FeedOptions, type FeedItem } from './feeds';

/** Stories in each home page column. */
export const COLUMN_SIZE = 6;
/** Popular shows a random few of the best-rated this many, so it changes from visit to visit. */
export const POPULAR_POOL = 30;
/** Where Recent's archive picks come from when there aren't enough new stories: the next best-rated. */
export const ARCHIVE_PICKS_POOL = 150;

export interface HomeColumns {
	popular: FeedItem[];
	recent: FeedItem[];
	/** True when Recent was topped up with picks from the archive. */
	recentHasArchivePicks: boolean;
}

/**
 * The Popular and Recent columns on the home and browse pages, `size` stories each. Popular is
 * a random few of the best-rated. Recent is stories written here, newest first.
 * Until there are enough of those, it's topped up with well-rated archive stories rather than
 * the last stories posted before Ficly closed, which few people read or rated.
 */
export async function homeColumns(
	db: DB,
	viewer: FeedOptions['viewer'],
	size = COLUMN_SIZE,
	random = Math.random
): Promise<HomeColumns> {
	const [best, members] = await Promise.all([
		popularFeed(db, { viewer, pageSize: ARCHIVE_PICKS_POOL }),
		memberFeed(db, { viewer, pageSize: size })
	]);
	const popular = sample(best.items.slice(0, POPULAR_POOL), size, random);
	// A new story that is already well rated shouldn't show up in both columns.
	const shown = new Set(popular.map((s) => s.id));
	const recent = members.items.filter((s) => !shown.has(s.id));
	const picks = sample(
		best.items.slice(POPULAR_POOL).filter((s) => !shown.has(s.id)),
		size - recent.length,
		random
	);
	return { popular, recent: [...recent, ...picks], recentHasArchivePicks: picks.length > 0 };
}
