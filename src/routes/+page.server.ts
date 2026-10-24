import {
	countEntries,
	ensureCurrentChallenge,
	pastChallenges,
	todaysPrompt
} from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { latestFeed, popularFeed } from '#lib/server/feeds.ts';
import { popularTags } from '#lib/server/tags.ts';
import { sample } from '#lib/sample.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 6;
/** Each column shows a random few of this many, so the home page changes from visit to visit. */
const POOL_SIZE = 30;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: POOL_SIZE };
	// If nothing is open, the first challenge in line starts now.
	await ensureCurrentChallenge(db);
	const [popular, recent, tags, past, prompt] = await Promise.all([
		popularFeed(db, opts),
		latestFeed(db, opts),
		popularTags(db, 14),
		pastChallenges(db, POOL_SIZE),
		todaysPrompt(db)
	]);
	const shownPopular = sample(popular.items, COLUMN_SIZE);
	// A new story that is already well rated shouldn't show up in both columns.
	const shown = new Set(shownPopular.map((s) => s.id));
	return {
		popular: shownPopular,
		recent: sample(
			recent.items.filter((s) => !shown.has(s.id)),
			COLUMN_SIZE
		),
		tags,
		pastChallenges: sample(past, COLUMN_SIZE),
		prompt: prompt ? { ...prompt, entries: await countEntries(db, prompt.id), isOpen: true } : null
	};
};
