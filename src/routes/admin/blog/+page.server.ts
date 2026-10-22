import { requireAdmin } from '#lib/server/auth.ts';
import { listAllPosts } from '#lib/server/blog.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	return { posts: await listAllPosts(db) };
};
