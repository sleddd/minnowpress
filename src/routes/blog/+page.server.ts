import { listPublishedPosts } from '#lib/server/blog.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => ({
	posts: await listPublishedPosts(db, { page: Number(url.searchParams.get('page')) || 1 })
});
