import { countWriters, listArchiveAuthors, listWriters } from '#lib/server/authors.ts';
import { db } from '#lib/server/db/index.ts';
import { queryInt } from '#lib/server/forms.ts';
import type { PageServerLoad } from './$types';

/** Archive authors shown at first and added by each "Show more": four full rows of four. */
const ARCHIVE_STEP = 16;
const ARCHIVE_MAX = 1024;

export const load: PageServerLoad = async ({ url }) => {
	const asked = queryInt(url.searchParams.get('show')) ?? ARCHIVE_STEP;
	const show = Math.min(ARCHIVE_MAX, Math.ceil(asked / ARCHIVE_STEP) * ARCHIVE_STEP);
	const [writers, writerCount, archive] = await Promise.all([
		listWriters(db, { pageSize: 60 }),
		countWriters(db),
		listArchiveAuthors(db, { pageSize: show })
	]);
	return {
		writers: writers.items,
		writerCount,
		archive: archive.items,
		moreArchive: archive.hasMore && show < ARCHIVE_MAX ? show + ARCHIVE_STEP : null
	};
};
