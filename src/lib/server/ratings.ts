import { and, eq, sql } from 'drizzle-orm';
import { averageRating, isValidScore } from '#lib/rating.ts';
import type { DB } from './db/client';
import { ratings, stories } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

/** The viewer's own rating of a story, or null. */
export async function getUserRating(
	db: DB,
	userId: number,
	storyId: number
): Promise<number | null> {
	const row = await db.query.ratings.findFirst({
		where: and(eq(ratings.userId, userId), eq(ratings.storyId, storyId))
	});
	return row?.score ?? null;
}

/** Recomputes a story's totals: the archive baseline plus every member rating. */
async function syncTotals(db: DB, storyId: number) {
	const [totals] = await db
		.update(stories)
		.set({
			ratingsCount: sql`${stories.archiveRatingsCount} + (select count(*) from ${ratings} where ${ratings.storyId} = ${storyId})`,
			ratingsTotal: sql`${stories.archiveRatingsTotal} + (select coalesce(sum(${ratings.score}), 0) from ${ratings} where ${ratings.storyId} = ${storyId})`
		})
		.where(eq(stories.id, storyId))
		.returning({ count: stories.ratingsCount, total: stories.ratingsTotal });
	return totals;
}

/** Rates a published story 1–5, replacing any earlier rating by the same reader. Authors can't rate their own. */
export async function rateStory(db: DB, userId: number, storyId: number, score: number) {
	if (!isValidScore(score)) throw new ValidationError({ score: 'Pick one to five fish.' });
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story || story.status !== 'published') throw new NotFoundError('Story not found');
	if (story.authorId === userId) throw new ForbiddenError('You cannot rate your own story.');

	await db
		.insert(ratings)
		.values({ userId, storyId, score })
		.onConflictDoUpdate({
			target: [ratings.userId, ratings.storyId],
			set: { score, updatedAt: new Date() }
		});
	const { count, total } = await syncTotals(db, storyId);
	return { score, count, average: averageRating(count, total) };
}
