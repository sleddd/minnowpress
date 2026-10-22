import { json } from '@sveltejs/kit';
import { recomputeActivityScores } from './activity';
import { ensureCurrentChallenge } from './challenges';
import type { DB } from './db/client';
import { sendWeeklyDigests, type NotifyContext } from './notifications';
import { ficlyExamples, generatePrompts, pickSeed, type PromptClient } from './prompts/generate';

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. No secret configured means no access. */
export function isAuthorizedCron(request: Request, secret: string | undefined): boolean {
	if (!secret) return false;
	return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * Daily: keeps one challenge running. When the current one has ended, the next approved
 * challenge starts; if none is waiting, a new AI prompt is generated and starts today.
 */
export async function runPromptCron(db: DB, client: PromptClient | null, now = new Date()) {
	const generate = client
		? async () => {
				const [prompt] = await generatePrompts(client, {
					count: 1,
					seed: pickSeed(now),
					examples: await ficlyExamples(db)
				});
				return prompt ? { title: prompt.title, promptText: prompt.prompt } : null;
			}
		: undefined;
	const { action, challenge } = await ensureCurrentChallenge(db, now, generate);
	if (action === 'none' && !client)
		return json(
			{ ok: false, error: 'No challenge is waiting and Bedrock credentials are not set' },
			{ status: 503 }
		);
	return json({ ok: true, action, challengeId: challenge?.id ?? null });
}

export async function runActivityCron(db: DB, now = new Date()) {
	const scored = await recomputeActivityScores(db, now);
	return json({ ok: true, scored });
}

export async function runDigestCron(db: DB, ctx: NotifyContext, now = new Date()) {
	const sent = await sendWeeklyDigests(db, ctx, now);
	return json({ ok: true, sent });
}
