import { error, redirect } from '@sveltejs/kit';
import { parseTags } from '#lib/text.ts';
import type { Relation } from '#lib/types.ts';
import { notify } from '#lib/server/app/index.ts';
import { requireUser } from '#lib/server/auth.ts';
import { deliverSafely, notifyContinuation } from '#lib/server/notifications.ts';
import { ensureCurrentChallenge, getChallenge, openChallenges } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { storyCounts } from '#lib/server/desk.ts';
import { formBool, formInt, formString, toActionFailure } from '#lib/server/forms.ts';
import {
	continueStory,
	createStory,
	getStory,
	updateStory,
	type StoryInput
} from '#lib/server/stories.ts';
import type { Actions, PageServerLoad } from './$types';

async function parentFor(id: number) {
	const parent = await getStory(db, id);
	if (!parent || parent.status !== 'published') error(404, 'Story not found');
	return { id: parent.id, title: parent.title, author: { displayName: parent.author.displayName } };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals.user, url);
	const q = url.searchParams;
	await ensureCurrentChallenge(db);
	const challenges = (await openChallenges(db)).map((c) => ({ id: c.id, title: c.title }));
	// Past challenges take stories too: offer the one you came from (or the draft's) in the picker.
	const wanted = Number(q.get('challenge')) || null;
	const addChallenge = async (id: number | null) => {
		if (!id || challenges.some((c) => c.id === id)) return;
		const c = await getChallenge(db, id);
		if (c && !c.upcoming) challenges.push({ id: c.id, title: c.title });
	};
	await addChallenge(wanted);
	const counts = await storyCounts(db, user.id);
	const values = {
		title: '',
		body: '',
		tags: '',
		isMature: false,
		challengeId: q.get('challenge') ?? ''
	};

	const editId = Number(q.get('edit')) || null;
	if (editId) {
		const draft = await getStory(db, editId, user.id);
		if (!draft || draft.authorId !== user.id) error(404, 'Story not found');
		if (draft.archive) error(403, 'Stories from the Ficly archive can’t be edited.');
		await addChallenge(draft.challengeId);
		return {
			values: {
				title: draft.title,
				body: draft.body,
				tags: draft.tags.join(', '),
				isMature: draft.isMature,
				challengeId: draft.challengeId ? String(draft.challengeId) : ''
			},
			editId,
			editingPublished: draft.status === 'published',
			counts,
			continuing: null,
			challenges,
			prompt: draft.challengeId ? await getChallenge(db, draft.challengeId) : null
		};
	}

	const sequelTo = Number(q.get('sequel_to')) || null;
	const prequelTo = Number(q.get('prequel_to')) || null;
	const parentId = sequelTo ?? prequelTo;
	const continuing = parentId
		? { relation: (sequelTo ? 'sequel' : 'prequel') as Relation, parent: await parentFor(parentId) }
		: null;
	const challengeId = Number(values.challengeId) || null;

	return {
		values,
		editId: null,
		editingPublished: false,
		counts,
		continuing,
		challenges,
		prompt: challengeId ? await getChallenge(db, challengeId) : null
	};
};

export const actions: Actions = {
	default: async ({ locals, url, request }) => {
		const user = requireUser(locals.user, url);
		const data = await request.formData();
		const values = {
			title: formString(data, 'title'),
			body: formString(data, 'body'),
			tags: formString(data, 'tags'),
			isMature: formBool(data, 'isMature'),
			challengeId: formString(data, 'challengeId')
		};
		const input: StoryInput = {
			title: values.title,
			body: values.body,
			tags: parseTags(values.tags),
			isMature: values.isMature,
			challengeId: formInt(data, 'challengeId'),
			publish: formString(data, 'intent') === 'publish' && !formBool(data, 'saveDraft')
		};
		const editId = formInt(data, 'editId');
		const parentId = formInt(data, 'parentId');
		const relation = formString(data, 'relation') === 'prequel' ? 'prequel' : 'sequel';

		let storyId: number;
		try {
			const story = editId
				? await updateStory(db, user.id, editId, input)
				: parentId
					? await continueStory(db, user.id, parentId, relation, input)
					: await createStory(db, user.id, input);
			storyId = story.id;
			// Only a story's first publication tells anyone; later edits don't.
			if (story.status === 'published' && !story.editedAt)
				await deliverSafely(() => notifyContinuation(db, notify, story.id));
		} catch (e) {
			return toActionFailure(e, { values });
		}
		redirect(303, `/s/${storyId}`);
	}
};
