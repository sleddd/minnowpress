import { requireUser } from '#lib/server/auth.ts';
import { authorsToFollow, listFollowing } from '#lib/server/authors.ts';
import { listPublishedPosts } from '#lib/server/blog.ts';
import { db } from '#lib/server/db/index.ts';
import { recentActivity, storyCounts } from '#lib/server/desk.ts';
import { followingFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 5;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	const opts = { viewer: user, pageSize: COLUMN_SIZE };
	const [news, activity, counts, fromFollowed, following, suggested] = await Promise.all([
		listPublishedPosts(db),
		recentActivity(db, user.id, 8),
		storyCounts(db, user.id),
		followingFeed(db, user.id, opts),
		listFollowing(db, user.id),
		authorsToFollow(db, { viewerId: user.id, limit: 4 })
	]);
	return {
		news: news.items[0] ?? null,
		activity,
		counts,
		fromFollowed: fromFollowed.items,
		following,
		suggested
	};
};
