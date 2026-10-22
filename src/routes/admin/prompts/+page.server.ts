import { fail } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/auth.ts';
import {
	approvePrompt,
	createChallenge,
	ensureCurrentChallenge,
	pendingPrompts,
	repackQueue,
	rejectPrompt,
	suggestNextStart
} from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { ValidationError } from '#lib/server/errors.ts';
import { formDate, formInt, formString, toActionFailure } from '#lib/server/forms.ts';
import { describePromptError, generateAndSavePrompts } from '#lib/server/prompts/generate.ts';
import { promptClient } from '#lib/server/prompts/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals.user);
	const [prompts, suggestedStart] = await Promise.all([pendingPrompts(db), suggestNextStart(db)]);
	return { prompts, suggestedStart, canGenerate: Boolean(promptClient) };
};

export const actions: Actions = {
	approve: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data = await request.formData();
		const id = formInt(data, 'id');
		const startsAt = formDate(data, 'startsAt');
		if (!id) return fail(400);
		try {
			if (!startsAt) throw new ValidationError({ startsAt: 'Pick a start date.' });
			await approvePrompt(
				db,
				admin.id,
				id,
				{ startsAt },
				{
					title: formString(data, 'title'),
					promptText: formString(data, 'promptText')
				}
			);
			// The first in line is always current, and the rest follow back to back.
			await ensureCurrentChallenge(db);
			await repackQueue(db);
			return { approved: id };
		} catch (e) {
			if (e instanceof ValidationError)
				return fail(400, { reviewError: { id, message: Object.values(e.fields).join(' ') } });
			return toActionFailure(e);
		}
	},

	reject: async ({ locals, request }) => {
		requireAdmin(locals.user);
		const id = formInt(await request.formData(), 'id');
		if (!id) return fail(400);
		try {
			await rejectPrompt(db, id);
		} catch (e) {
			return toActionFailure(e);
		}
	},

	create: async ({ locals, request }) => {
		const admin = requireAdmin(locals.user);
		const data = await request.formData();
		try {
			await createChallenge(db, {
				title: formString(data, 'title'),
				promptText: formString(data, 'promptText'),
				source: 'human',
				createdBy: admin.id
			});
			return { created: true };
		} catch (e) {
			return toActionFailure(e);
		}
	},

	generate: async ({ locals }) => {
		requireAdmin(locals.user);
		if (!promptClient)
			return fail(503, { errors: { generate: 'Bedrock credentials are not set.' } });
		try {
			const saved = await generateAndSavePrompts(db, promptClient);
			return { generated: saved.length };
		} catch (e) {
			console.error('Prompt generation failed', e);
			return fail(502, { errors: { generate: describePromptError(e) } });
		}
	}
};
