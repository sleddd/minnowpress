import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { bookmarksFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	// Saved stories stay visible even if they're mature: the reader chose them.
	const feed = await bookmarksFeed(db, user.id, {
		viewer: { id: user.id, showMature: true },
		page: Number(url.searchParams.get('page')) || 1
	});
	return { feed };
};
