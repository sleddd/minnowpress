import { db } from '#lib/server/db/index.ts';
import { pageParam } from '#lib/server/forms.ts';
import { allowSearch, normalizeQuery, searchAll, searchKey } from '#lib/server/search.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, getClientAddress }) => {
	const query = normalizeQuery(url.searchParams.get('q'));
	if (!query) return { results: null, raw: url.searchParams.get('q') ?? '', limited: false };
	if (!(await allowSearch(db, searchKey(getClientAddress))))
		return { results: null, raw: query, limited: true };
	const results = await searchAll(db, query, {
		viewer: locals.user,
		page: pageParam(url.searchParams.get('page'))
	});
	return { results, raw: query, limited: false };
};
