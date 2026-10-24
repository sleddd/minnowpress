import { and, count, desc, eq, isNull, lt, ne, sql } from 'drizzle-orm';
import { alias, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { DB } from './db/client';
import { comments, ratings, stories, users } from './db/schema';

export interface ActivityEvent {
	/**
	 * comment, sequel, prequel, rating: someone commented on, continued or rated the member's
	 * story. rated: the member rated someone else's story.
	 */
	kind: 'comment' | 'sequel' | 'prequel' | 'rating' | 'rated';
	at: Date;
	/** Who did it; null for the member's own ratings. */
	actor: { username: string; displayName: string } | null;
	/** The story that was commented on, continued or rated. */
	story: { id: number; title: string };
	/** For continuations, the new story. */
	continuation: { id: number; title: string } | null;
	/** For ratings, how many fish. */
	score: number | null;
}

export interface ActivityPage {
	items: ActivityEvent[];
	/** Pass as `before` for the next, older page; null when there's nothing older. */
	next: Date | null;
}

/**
 * The member's activity, newest first: comments on, continuations of and ratings of their
 * stories by other people, and their own ratings of other stories. Each kind is read
 * newest first and at most one page long, then merged, so an older page costs no more.
 */
export async function recentActivity(
	db: DB,
	userId: number,
	opts: { limit?: number; before?: Date | null } = {}
): Promise<ActivityPage> {
	const limit = opts.limit ?? 10;
	const take = limit + 1;
	const older = <T extends AnySQLiteColumn>(column: T) =>
		opts.before ? lt(column, opts.before) : undefined;
	const child = alias(stories, 'child');
	const [commentRows, continuationRows, ratingRows, ratedRows] = await Promise.all([
		db
			.select({
				at: comments.createdAt,
				actor: { username: users.username, displayName: users.displayName },
				story: { id: stories.id, title: stories.title }
			})
			.from(comments)
			.innerJoin(stories, eq(stories.id, comments.storyId))
			.innerJoin(users, eq(users.id, comments.authorId))
			.where(
				and(
					eq(stories.authorId, userId),
					ne(comments.authorId, userId),
					isNull(comments.deletedAt),
					eq(stories.status, 'published'),
					older(comments.createdAt)
				)
			)
			.orderBy(desc(comments.createdAt))
			.limit(take),
		db
			.select({
				at: child.publishedAt,
				relation: child.relation,
				actor: { username: users.username, displayName: users.displayName },
				story: { id: stories.id, title: stories.title },
				continuation: { id: child.id, title: child.title }
			})
			.from(child)
			.innerJoin(stories, eq(stories.id, child.parentId))
			.innerJoin(users, eq(users.id, child.authorId))
			.where(
				and(
					eq(stories.authorId, userId),
					ne(child.authorId, userId),
					// Unary +: start from the member's own stories and follow their continuations,
					// rather than walking every published story newest first to find them.
					sql`+${child.status} = 'published'`,
					ne(stories.status, 'removed'),
					older(child.publishedAt)
				)
			)
			.orderBy(desc(child.publishedAt))
			.limit(take),
		db
			.select({
				at: ratings.updatedAt,
				score: ratings.score,
				actor: { username: users.username, displayName: users.displayName },
				story: { id: stories.id, title: stories.title }
			})
			.from(ratings)
			.innerJoin(stories, eq(stories.id, ratings.storyId))
			.innerJoin(users, eq(users.id, ratings.userId))
			.where(
				and(
					eq(stories.authorId, userId),
					ne(ratings.userId, userId),
					eq(stories.status, 'published'),
					older(ratings.updatedAt)
				)
			)
			.orderBy(desc(ratings.updatedAt))
			.limit(take),
		db
			.select({
				at: ratings.updatedAt,
				score: ratings.score,
				story: { id: stories.id, title: stories.title }
			})
			.from(ratings)
			.innerJoin(stories, eq(stories.id, ratings.storyId))
			.where(
				and(eq(ratings.userId, userId), eq(stories.status, 'published'), older(ratings.updatedAt))
			)
			.orderBy(desc(ratings.updatedAt))
			.limit(take)
	]);
	const events: ActivityEvent[] = [
		...commentRows.map((r) => ({
			kind: 'comment' as const,
			continuation: null,
			score: null,
			...r
		})),
		...continuationRows.map((r) => ({
			kind: (r.relation ?? 'sequel') as 'sequel' | 'prequel',
			at: r.at!,
			actor: r.actor,
			story: r.story,
			continuation: r.continuation,
			score: null
		})),
		...ratingRows.map((r) => ({ kind: 'rating' as const, continuation: null, ...r })),
		...ratedRows.map((r) => ({ kind: 'rated' as const, actor: null, continuation: null, ...r }))
	].sort((a, b) => b.at.getTime() - a.at.getTime());
	const items = events.slice(0, limit);
	return { items, next: events.length > limit ? items[items.length - 1].at : null };
}

/** Draft and published counts for the desk sidebar. */
export async function storyCounts(db: DB, userId: number) {
	const rows = await db
		.select({ status: stories.status, n: count() })
		.from(stories)
		.where(eq(stories.authorId, userId))
		.groupBy(stories.status);
	const of = (status: string) => rows.find((r) => r.status === status)?.n ?? 0;
	return { drafts: of('draft'), published: of('published') };
}

export interface OwnStory {
	id: number;
	title: string;
	draft: boolean;
	at: Date;
}

/**
 * The member's latest stories for their desk, drafts and published together, newest first.
 * Two reads of at most `limit` rows each, so a prolific writer's desk costs no more to load.
 */
export async function latestOwnStories(db: DB, userId: number, limit = 6): Promise<OwnStory[]> {
	const columns = {
		id: stories.id,
		title: stories.title,
		status: stories.status,
		createdAt: stories.createdAt,
		publishedAt: stories.publishedAt
	};
	const mine = (status: 'published' | 'draft') =>
		and(eq(stories.authorId, userId), eq(stories.status, status));
	const [published, drafts] = await Promise.all([
		db
			.select(columns)
			.from(stories)
			.where(mine('published'))
			.orderBy(desc(stories.publishedAt), desc(stories.id))
			.limit(limit),
		db
			.select(columns)
			.from(stories)
			.where(mine('draft'))
			.orderBy(desc(stories.createdAt), desc(stories.id))
			.limit(limit)
	]);
	return [...published, ...drafts]
		.map((r) => ({
			id: r.id,
			title: r.title,
			draft: r.status === 'draft',
			at: r.publishedAt ?? r.createdAt
		}))
		.sort((a, b) => b.at.getTime() - a.at.getTime() || b.id - a.id)
		.slice(0, limit);
}
