import { error } from '@sveltejs/kit';
import { getArchiveAuthor } from '#lib/server/authors.ts';
import { db } from '#lib/server/db/index.ts';
import { archiveAuthorFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const author = await getArchiveAuthor(db, params.slug);
	if (!author) error(404, 'Author not found');
	const feed = await archiveAuthorFeed(db, author.url, {
		viewer: locals.user,
		page: Number(url.searchParams.get('page')) || 1
	});
	return { author, feed };
};
