import { refreshActivityIfStale } from '#lib/server/activity.ts';
import { countEntries, ensureCurrentChallenge, todaysPrompt } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { activeFeed, latestFeed, popularFeed } from '#lib/server/feeds.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 6;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: COLUMN_SIZE };
	// If nothing is open, the first challenge in line starts now; the Active column is rescored
	// here, on the visit, when it's gone stale.
	await Promise.all([ensureCurrentChallenge(db), refreshActivityIfStale(db)]);
	const [popular, active, recent, tags, prompt] = await Promise.all([
		popularFeed(db, opts),
		activeFeed(db, opts),
		latestFeed(db, opts),
		popularTags(db, 14),
		todaysPrompt(db)
	]);
	return {
		popular: popular.items,
		active: active.items,
		recent: recent.items,
		tags,
		prompt: prompt ? { ...prompt, entries: await countEntries(db, prompt.id), isOpen: true } : null
	};
};
