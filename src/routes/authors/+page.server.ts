import { listArchiveAuthors, listWriters } from '#lib/server/authors.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const [writers, archive] = await Promise.all([
		page === 1 ? listWriters(db, { pageSize: 60 }) : { items: [], hasMore: false },
		listArchiveAuthors(db, { page, pageSize: 60 })
	]);
	return { writers: writers.items, archive: archive.items, page, hasMore: archive.hasMore };
};
