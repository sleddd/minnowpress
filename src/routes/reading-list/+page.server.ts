import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { pageParam } from '#lib/server/forms.ts';
import { bookmarksFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	// Saved mature stories show only while the reader has mature stories turned on.
	const feed = await bookmarksFeed(db, user.id, {
		viewer: user,
		page: pageParam(url.searchParams.get('page'))
	});
	return { feed };
};
