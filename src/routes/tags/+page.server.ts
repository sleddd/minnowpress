import { db } from '#lib/server/db/index.ts';
import { tagIndex } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	tags: await tagIndex(db, { page: Number(url.searchParams.get('page')) || 1 })
});
