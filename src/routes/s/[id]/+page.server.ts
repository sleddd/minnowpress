import { error, fail, redirect } from '@sveltejs/kit';
import { notify } from '#lib/server/app/index.ts';
import { isModerator, requireModerator, requireUser } from '#lib/server/auth.ts';
import { isBookmarked, toggleBookmark } from '#lib/server/bookmarks.ts';
import { db } from '#lib/server/db/index.ts';
import { formInt, formString, paramInt, toActionFailure } from '#lib/server/forms.ts';
import { RateLimitError } from '#lib/server/errors.ts';
import { fileReport, REPORT_REASONS, type ReportReason } from '#lib/server/moderation.ts';
import { deliverSafely, notifyComment, notifyContinuation } from '#lib/server/notifications.ts';
import { getUserRating, rateStory } from '#lib/server/ratings.ts';
import { addComment, deleteComment, listComments } from '#lib/server/social.ts';
import {
	deleteStory,
	getStory,
	matureHiddenFrom,
	publishStory,
	removeStory,
	setStoryMature
} from '#lib/server/stories.ts';
import type { User } from '#lib/server/db/schema.ts';
import type { Actions, PageServerLoad } from './$types';

/** The story id, once it's clear the member may see the story they're acting on. */
async function readable(param: string, user: User): Promise<number> {
	const id = paramInt(param);
	const story = await getStory(db, id, user.id);
	if (!story) error(404, 'Story not found');
	if (matureHiddenFrom(story, user))
		error(403, 'Turn on mature stories in Settings to read and respond to this one.');
	return id;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = paramInt(params.id);
	const viewer = locals.user;
	const story = await getStory(db, id, viewer?.id);
	if (!story) error(404, 'Story not found');
	const matureHidden = matureHiddenFrom(story, viewer);

	const [comments, rating, bookmarked] = await Promise.all([
		story.status === 'published' && !matureHidden ? listComments(db, id) : [],
		viewer ? getUserRating(db, viewer.id, id) : null,
		viewer ? isBookmarked(db, viewer.id, id) : false
	]);

	return {
		story: matureHidden ? { ...story, body: '' } : story,
		matureHidden,
		comments,
		rating,
		bookmarked,
		isAuthor: viewer?.id === story.authorId,
		isModerator: isModerator(viewer)
	};
};

export const actions: Actions = {
	rate: async ({ params, locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const score = formInt(await request.formData(), 'score');
		const id = await readable(params.id, user);
		try {
			return await rateStory(db, user.id, id, score ?? 0);
		} catch (e) {
			return toActionFailure(e);
		}
	},

	bookmark: async ({ params, locals, url }) => {
		const user = requireUser(locals.user, url);
		const id = await readable(params.id, user);
		try {
			return await toggleBookmark(db, user.id, id);
		} catch (e) {
			return toActionFailure(e);
		}
	},

	comment: async ({ params, locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const body = formString(await request.formData(), 'body');
		const id = await readable(params.id, user);
		try {
			const comment = await addComment(db, user.id, id, body);
			await deliverSafely(() => notifyComment(db, notify, comment.id));
			return { commented: true };
		} catch (e) {
			if (e instanceof RateLimitError)
				return fail(429, { commentBody: body, errors: { body: e.message } });
			return toActionFailure(e, { commentBody: body });
		}
	},

	deleteComment: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const commentId = formInt(await request.formData(), 'commentId');
		if (!commentId) return fail(400);
		try {
			await deleteComment(db, user.id, commentId, { asModerator: isModerator(user) });
		} catch (e) {
			return toActionFailure(e);
		}
	},

	report: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		const targetType = formString(data, 'targetType') === 'comment' ? 'comment' : 'story';
		const targetId = formInt(data, 'targetId');
		const reason = formString(data, 'reason') as ReportReason;
		if (!targetId || !REPORT_REASONS.includes(reason)) return fail(400);
		try {
			await fileReport(db, user.id, {
				targetType,
				targetId,
				reason,
				note: formString(data, 'note')
			});
			return { reported: { targetType, targetId } };
		} catch (e) {
			return toActionFailure(e);
		}
	},

	publish: async ({ params, locals, url }) => {
		const user = requireUser(locals.user, url);
		try {
			const story = await publishStory(db, user.id, paramInt(params.id));
			await deliverSafely(() => notifyContinuation(db, notify, story.id));
		} catch (e) {
			return toActionFailure(e);
		}
	},

	delete: async ({ params, locals, url }) => {
		const user = requireUser(locals.user, url);
		try {
			await deleteStory(db, user.id, paramInt(params.id));
		} catch (e) {
			return toActionFailure(e);
		}
		redirect(303, `/@${user.username}`);
	},

	mature: async ({ params, locals, request }) => {
		const mod = requireModerator(locals.user);
		const mature = formString(await request.formData(), 'mature') === 'true';
		try {
			await setStoryMature(db, paramInt(params.id), mod.id, mature);
		} catch (e) {
			return toActionFailure(e);
		}
	},

	remove: async ({ params, locals }) => {
		const mod = requireModerator(locals.user);
		await removeStory(db, paramInt(params.id), mod.id);
		redirect(303, '/');
	}
};
