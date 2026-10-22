import { and, eq, gt, gte, lt, ne, or, sql } from 'drizzle-orm';
import type { DB } from './db/client';
import { jobRuns, stories } from './db/schema';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
/** Stories older than this drop out of the Active feed. */
export const ACTIVE_WINDOW_DAYS = 30;
/** How stale the Active feed may be before a page visit rescores it. */
export const ACTIVITY_MAX_AGE = 5 * MINUTE;

export interface ActivitySignals {
	ratings: number;
	comments: number;
	continuations: number;
	ageHours: number;
}

/**
 * Hacker News-style decay. Continuations weigh most because they are the heart of the site:
 * someone cared enough to write the next part.
 */
export function computeActivityScore({
	ratings,
	comments,
	continuations,
	ageHours
}: ActivitySignals): number {
	const points = 1 + ratings + 2 * comments + 3 * continuations;
	return points / Math.pow(Math.max(ageHours, 0) + 2, 1.5);
}

/** Recomputes activity_score for recent published stories and zeroes everything else. Returns how many were scored. */
export async function recomputeActivityScores(db: DB, now = new Date()): Promise<number> {
	const since = new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * HOUR);
	const recent = await db
		.select({
			id: stories.id,
			ratings: sql<number>`${stories.ratingsCount} - ${stories.archiveRatingsCount}`,
			comments: stories.commentsCount,
			publishedAt: stories.publishedAt,
			continuations: sql<number>`(select count(*) from stories c where c.parent_id = ${stories.id} and c.status = 'published')`
		})
		.from(stories)
		.where(and(eq(stories.status, 'published'), gte(stories.publishedAt, since)));

	for (const s of recent) {
		const ageHours = (now.getTime() - (s.publishedAt?.getTime() ?? now.getTime())) / HOUR;
		const score = computeActivityScore({
			...s,
			ratings: Number(s.ratings),
			continuations: Number(s.continuations),
			ageHours
		});
		await db.update(stories).set({ activityScore: score }).where(eq(stories.id, s.id));
	}

	// Only stories that still carry a score, through its index: never a pass over the archive.
	await db
		.update(stories)
		.set({ activityScore: 0 })
		.where(
			and(
				gt(stories.activityScore, 0),
				or(ne(stories.status, 'published'), lt(stories.publishedAt, since))
			)
		);
	return recent.length;
}

/**
 * Rescores the Active feed when a page that shows it is visited, if the last rescoring is more
 * than ACTIVITY_MAX_AGE ago. The page never waits on a failure: it's logged and the feed shows
 * the previous scores. Returns whether a rescoring ran.
 */
export async function refreshActivityIfStale(
	db: DB,
	now = new Date(),
	log: (message: string, error: unknown) => void = console.error
): Promise<boolean> {
	try {
		const last = await db.query.jobRuns.findFirst({ where: eq(jobRuns.name, 'activity') });
		if (last && now.getTime() - last.ranAt.getTime() < ACTIVITY_MAX_AGE) return false;
		await db
			.insert(jobRuns)
			.values({ name: 'activity', ranAt: now })
			.onConflictDoUpdate({ target: jobRuns.name, set: { ranAt: now } });
		await recomputeActivityScores(db, now);
		return true;
	} catch (e) {
		log('Activity rescoring failed; showing the previous scores', e);
		return false;
	}
}
