import { error } from '@sveltejs/kit';
import { isModerator, requireModerator, requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { authorFeed } from '#lib/server/feeds.ts';
import { pageParam, toActionFailure } from '#lib/server/forms.ts';
import { suspendUser, unsuspendUser } from '#lib/server/moderation.ts';
import { follow, followCounts, isFollowing, unfollow } from '#lib/server/social.ts';
import { countPublishedStories, getUserStories } from '#lib/server/stories.ts';
import { getUserByUsername } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

async function profileUser(username: string) {
	const user = await getUserByUsername(db, username);
	if (!user) error(404, 'Writer not found');
	return user;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = await profileUser(params.username);
	const viewer = locals.user;
	const isSelf = viewer?.id === user.id;
	// The owner always sees their own mature stories.
	const feedViewer = isSelf && viewer ? { ...viewer, showMature: true } : viewer;

	const [feed, counts, stories, following, own] = await Promise.all([
		authorFeed(db, user.id, {
			viewer: feedViewer,
			page: pageParam(url.searchParams.get('page'))
		}),
		followCounts(db, user.id),
		countPublishedStories(db, user.id),
		viewer && !isSelf ? isFollowing(db, viewer.id, user.id) : false,
		isSelf ? getUserStories(db, user.id, { includeDrafts: true }) : []
	]);
	const author = {
		id: user.id,
		username: user.username,
		displayName: user.displayName,
		avatarUrl: user.avatarUrl
	};
	const drafts = own
		.filter((s) => s.status === 'draft')
		.map((s) => ({
			...s,
			author,
			archive: null,
			tags: [],
			averageRating: null,
			publishedAt: s.createdAt
		}));

	return {
		profile: {
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			website: user.website,
			avatarUrl: user.avatarUrl,
			createdAt: user.createdAt
		},
		counts: { ...counts, stories },
		feed,
		drafts,
		isSelf,
		following,
		// Moderators can suspend ordinary members from their profile.
		moderation:
			isModerator(viewer) && user.role === 'user' && !user.isArchive
				? { suspended: Boolean(user.suspendedAt) }
				: null
	};
};

export const actions: Actions = {
	follow: async ({ params, locals, url }) => {
		const viewer = requireUser(locals.user, url);
		const user = await profileUser(params.username);
		try {
			await follow(db, viewer.id, user.id);
		} catch (e) {
			return toActionFailure(e);
		}
	},
	unfollow: async ({ params, locals, url }) => {
		const viewer = requireUser(locals.user, url);
		const user = await profileUser(params.username);
		await unfollow(db, viewer.id, user.id);
	},
	suspend: async ({ params, locals }) => {
		const mod = requireModerator(locals.user);
		const user = await profileUser(params.username);
		try {
			await suspendUser(db, mod.id, user.id);
		} catch (e) {
			return toActionFailure(e);
		}
	},
	unsuspend: async ({ params, locals }) => {
		const mod = requireModerator(locals.user);
		const user = await profileUser(params.username);
		await unsuspendUser(db, mod.id, user.id);
	}
};
