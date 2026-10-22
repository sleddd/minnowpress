import { error, fail, redirect } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth.ts';
import { createPost, deletePost, getPost, updatePost } from '#lib/server/blog.ts';
import { db } from '#lib/server/db/index.ts';
import { formString, toActionFailure } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

/** "new" creates a post; a number edits one. */
function postId(param: string): number | null {
	if (param === 'new') return null;
	const id = Number(param);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Post not found');
	return id;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	requireAdmin(locals.user);
	const id = postId(params.id);
	if (id === null) return { post: null, values: { title: '', body: '' } };
	const post = await getPost(db, id);
	if (!post) error(404, 'Post not found');
	return { post, values: { title: post.title, body: post.body } };
};

export const actions: Actions = {
	save: async ({ params, locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data = await request.formData();
		const values = { title: formString(data, 'title'), body: formString(data, 'body') };
		const input = { ...values, publish: formString(data, 'intent') === 'publish' };
		const id = postId(params.id);
		let saved;
		try {
			saved = id === null ? await createPost(db, admin.id, input) : await updatePost(db, id, input);
		} catch (e) {
			return toActionFailure(e, { values });
		}
		if (id === null) redirect(303, `/admin/blog/${saved.id}?saved=1`);
		return { saved: true };
	},

	delete: async ({ params, locals }) => {
		requireAdmin(locals.user);
		const id = postId(params.id);
		if (id === null) return fail(400);
		try {
			await deletePost(db, id);
		} catch (e) {
			return toActionFailure(e);
		}
		redirect(303, '/admin/blog');
	}
};
