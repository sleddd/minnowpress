import { and, count, eq, gt } from 'drizzle-orm';
import type { DB } from './db/client';
import { comments, reports, stories } from './db/schema';

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

/** True while the member is under the hourly limit for this kind of post. */
export async function underHourlyLimit(
	db: DB,
	action: LimitedAction,
	userId: number,
	now = new Date()
): Promise<boolean> {
	const { table, by, at } = sources[action];
	const [{ n }] = await db
		.select({ n: count() })
		.from(table)
		.where(and(eq(by, userId), gt(at, new Date(now.getTime() - HOUR))));
	return n < HOURLY_LIMITS[action];
}

export const LIMIT_MESSAGE = 'You’re posting faster than we allow. Try again in a little while.';
