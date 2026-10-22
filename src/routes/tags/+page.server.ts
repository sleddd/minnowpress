import { db } from '#lib/server/db/index.ts';
import { pageParam } from '#lib/server/forms.ts';
import { tagIndex } from '#lib/server/tags.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	tags: await tagIndex(db, { page: pageParam(url.searchParams.get('page')) })
});
