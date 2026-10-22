import { db } from '#lib/server/db/index.ts';
import { normalizeQuery, searchAll } from '#lib/server/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = normalizeQuery(url.searchParams.get('q'));
	if (!query) return { results: null, raw: url.searchParams.get('q') ?? '' };
	const results = await searchAll(db, query, {
		viewer: locals.user,
		page: Number(url.searchParams.get('page')) || 1
	});
	return { results, raw: query };
};
