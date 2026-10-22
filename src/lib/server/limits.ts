import { and, count, eq, gt } from 'drizzle-orm';
import type { DB } from './db/client';
import { comments, reports, stories } from './db/schema';
import { RATE_LIMIT_MESSAGE, RateLimitError } from './errors';

const HOUR = 60 * 60 * 1000;

/**
 * How many of each thing one member can post per hour. Generous for people, but a ceiling on
 * spam, and on the emails a comment or continuation sends someone else.
 */
export const HOURLY_LIMITS = { comment: 30, report: 20, story: 20 } as const;

export type LimitedAction = keyof typeof HOURLY_LIMITS;

const sources = {
	comment: { table: comments, by: comments.authorId, at: comments.createdAt },
	report: { table: reports, by: reports.reporterId, at: reports.createdAt },
	story: { table: stories, by: stories.authorId, at: stories.createdAt }
};

/**
 * Throws RateLimitError when the member now has more than the hourly limit of this kind of post.
 * Called right after the new row is inserted, so it counts itself and every concurrent post that
 * landed before it: a burst of parallel requests can't all slip under a limit they would each
 * have passed alone. The caller deletes its own row when this throws.
 */
export async function assertUnderHourlyLimit(
	db: DB,
	action: LimitedAction,
	userId: number,
	now = new Date()
): Promise<void> {
	const { table, by, at } = sources[action];
	const [{ n }] = await db
		.select({ n: count() })
		.from(table)
		.where(and(eq(by, userId), gt(at, new Date(now.getTime() - HOUR))));
	if (n > HOURLY_LIMITS[action]) throw new RateLimitError();
}

export const LIMIT_MESSAGE = RATE_LIMIT_MESSAGE;
