import { sample } from '#lib/sample.ts';
import {
	countEntries,
	ensureCurrentChallenge,
	pastChallenges,
	todaysPrompt
} from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { COLUMN_SIZE, homeColumns } from '#lib/server/home.ts';
import { popularTags } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

/** Past challenges shows a random few of the latest this many. */
const PAST_CHALLENGES_POOL = 30;

export const load: PageServerLoad = async ({ locals }) => {
	// If nothing is open, the first challenge in line starts now.
	await ensureCurrentChallenge(db);
	const [columns, tags, past, prompt] = await Promise.all([
		homeColumns(db, locals.user),
		popularTags(db, 14),
		pastChallenges(db, PAST_CHALLENGES_POOL),
		todaysPrompt(db)
	]);
	return {
		...columns,
		tags,
		pastChallenges: sample(past, COLUMN_SIZE),
		prompt: prompt ? { ...prompt, entries: await countEntries(db, prompt.id), isOpen: true } : null
	};
};
