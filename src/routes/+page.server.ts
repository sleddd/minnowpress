import {
	countEntries,
	ensureCurrentChallenge,
	pastChallenges,
	todaysPrompt
} from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { latestFeed, popularFeed } from '#lib/server/feeds.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 6;

export const load: PageServerLoad = async ({ locals }) => {
	const opts = { viewer: locals.user, pageSize: COLUMN_SIZE };
	// If nothing is open, the first challenge in line starts now.
	await ensureCurrentChallenge(db);
	const [popular, recent, tags, past, prompt] = await Promise.all([
		popularFeed(db, opts),
		latestFeed(db, opts),
		popularTags(db, 14),
		pastChallenges(db, COLUMN_SIZE),
		todaysPrompt(db)
	]);
	return {
		popular: popular.items,
		recent: recent.items,
		tags,
		pastChallenges: past,
		prompt: prompt ? { ...prompt, entries: await countEntries(db, prompt.id), isOpen: true } : null
	};
};
