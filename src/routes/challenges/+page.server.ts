import { ensureCurrentChallenge, listChallenges } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// If nothing is open, the first challenge in line starts now.
	await ensureCurrentChallenge(db);
	return listChallenges(db, { page: Number(url.searchParams.get('page')) || 1 });
};
