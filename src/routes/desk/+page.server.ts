import { requireUser } from '#lib/server/auth.ts';
import { authorsToFollow, listFollowing } from '#lib/server/authors.ts';
import { db } from '#lib/server/db/index.ts';
import { latestOwnStories, recentActivity, storyCounts } from '#lib/server/desk.ts';
import { followingFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

const COLUMN_SIZE = 5;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	const opts = { viewer: user, pageSize: COLUMN_SIZE };
	const [mine, activity, counts, fromFollowed, following, suggested] = await Promise.all([
		latestOwnStories(db, user.id),
		recentActivity(db, user.id, { limit: 3, showMature: user.showMature }),
		storyCounts(db, user.id),
		followingFeed(db, user.id, opts),
		listFollowing(db, user.id),
		authorsToFollow(db, { viewerId: user.id, limit: 4 })
	]);
	return {
		stories: mine,
		activity: activity.items,
		counts,
		fromFollowed: fromFollowed.items,
		following,
		suggested
	};
};
