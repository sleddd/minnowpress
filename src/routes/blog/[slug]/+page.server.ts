import { error } from '@sveltejs/kit';
import { getPublishedPost, previousPost } from '#lib/server/blog.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const post = await getPublishedPost(db, params.slug);
	if (!post) error(404, 'Post not found');
	return { post, previous: await previousPost(db, post), canEdit: locals.user?.role === 'admin' };
};
