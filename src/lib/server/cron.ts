import { createHash, timingSafeEqual } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { refreshAllAuthorCounts, refreshArchiveAuthors } from './authors';
import { ensureCurrentChallenge } from './challenges';
import type { DB } from './db/client';
import { sendWeeklyDigests, type NotifyContext } from './notifications';
import { ficlyExamples, generatePrompts, pickSeed, type PromptClient } from './prompts/generate';
import { refreshAllTagCounts } from './tags';
import { fillNameKeys } from './users';

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. No secret configured means no access. */
export function isAuthorizedCron(request: Request, secret: string | undefined): boolean {
	if (!secret) return false;
	// Compared as fixed-length digests in constant time, so response timing can't leak the secret.
	const digest = (s: string) => createHash('sha256').update(s).digest();
	return timingSafeEqual(
		digest(request.headers.get('authorization') ?? ''),
		digest(`Bearer ${secret}`)
	);
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

/**
 * Daily maintenance: rebuilds the summaries the busy pages read from (tag counts, archive
 * authors, archive names, members' name keys) so any drift from moderation is gone by morning, and refreshes the planner
 * statistics SQLite needs to pick the tag and full-text indexes over a scan of every story.
 * The Active feed is not rescored here; a visit to a page that shows it does that
 * (refreshActivityIfStale).
 */
export async function runActivityCron(db: DB) {
	await refreshAllTagCounts(db);
	await refreshAllAuthorCounts(db);
	await refreshArchiveAuthors(db);
	await fillNameKeys(db);
	await db.run(sql`analyze`);
	return json({ ok: true });
}

export async function runDigestCron(db: DB, ctx: NotifyContext, now = new Date()) {
	const sent = await sendWeeklyDigests(db, ctx, now);
	return json({ ok: true, sent });
}
