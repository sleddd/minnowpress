import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { getArchiveAuthor } from '#lib/server/authors.ts';
import { db } from '#lib/server/db/index.ts';
import { pageParam, toActionFailure } from '#lib/server/forms.ts';
import { archiveAuthorFeed } from '#lib/server/feeds.ts';
import {
	followArchiveAuthor,
	isFollowingArchiveAuthor,
	unfollowArchiveAuthor
} from '#lib/server/social.ts';
import type { Actions, PageServerLoad } from './$types';

async function archiveAuthor(slug: string) {
	const author = await getArchiveAuthor(db, slug);
	if (!author) error(404, 'Author not found');
	return author;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const author = await archiveAuthor(params.slug);
	const [feed, following] = await Promise.all([
		archiveAuthorFeed(db, author.url, {
			viewer: locals.user,
			page: pageParam(url.searchParams.get('page'))
		}),
		locals.user ? isFollowingArchiveAuthor(db, locals.user.id, author.url) : false
	]);
	return { author, feed, following };
};

export const actions: Actions = {
	follow: async ({ params, locals, url }) => {
		const viewer = requireUser(locals.user, url);
		const author = await archiveAuthor(params.slug);
		try {
			await followArchiveAuthor(db, viewer.id, author.url);
		} catch (e) {
			return toActionFailure(e);
		}
	},
	unfollow: async ({ params, locals, url }) => {
		const viewer = requireUser(locals.user, url);
		const author = await archiveAuthor(params.slug);
		await unfollowArchiveAuthor(db, viewer.id, author.url);
	}
};
