import { and, count, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { DB } from './db/client';
import { comments, stories, users } from './db/schema';

export interface ActivityEvent {
	kind: 'comment' | 'sequel' | 'prequel';
	at: Date;
	actor: { username: string; displayName: string };
	/** The member's story that was commented on or continued. */
	story: { id: number; title: string };
	/** For continuations, the new story. */
	continuation: { id: number; title: string } | null;
}

/** Comments on and continuations of the member's stories by other people, newest first. */
export async function recentActivity(db: DB, userId: number, limit = 10): Promise<ActivityEvent[]> {
	const child = alias(stories, 'child');
	const [commentRows, continuationRows] = await Promise.all([
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
					eq(stories.status, 'published')
				)
			)
			.orderBy(desc(comments.createdAt))
			.limit(limit),
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
					ne(stories.status, 'removed')
				)
			)
			.orderBy(desc(child.publishedAt))
			.limit(limit)
	]);
	const events: ActivityEvent[] = [
		...commentRows.map((r) => ({ kind: 'comment' as const, continuation: null, ...r })),
		...continuationRows.map((r) => ({
			kind: (r.relation ?? 'sequel') as 'sequel' | 'prequel',
			at: r.at!,
			actor: r.actor,
			story: r.story,
			continuation: r.continuation
		}))
	];
	return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
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
