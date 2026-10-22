import { and, desc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import { averageRating } from '#lib/rating.ts';
import type { DB } from './db/client';
import { bookmarks, follows, stories, storyTags, tags, users } from './db/schema';
import { archiveColumns, archiveOf, authorColumns, tagsFor } from './stories';

export const PAGE_SIZE = 20;

export interface FeedOptions {
	viewer?: { id: number; showMature: boolean } | null;
	page?: number;
	/** Items per page; defaults to PAGE_SIZE. */
	pageSize?: number;
}

async function feed(db: DB, where: SQL | undefined, order: SQL[], opts: FeedOptions) {
	const page = Math.max(1, opts.page ?? 1);
	const size = opts.pageSize ?? PAGE_SIZE;
	const conditions = [eq(stories.status, 'published'), where];
	if (!opts.viewer?.showMature) conditions.push(eq(stories.isMature, false));

	const rows = await db
		.select({
			id: stories.id,
			title: stories.title,
			body: stories.body,
			isMature: stories.isMature,
			relation: stories.relation,
			parentId: stories.parentId,
			ratingsCount: stories.ratingsCount,
			ratingsTotal: stories.ratingsTotal,
			commentsCount: stories.commentsCount,
			publishedAt: stories.publishedAt,
			author: authorColumns,
			...archiveColumns
		})
		.from(stories)
		.innerJoin(users, eq(users.id, stories.authorId))
		.where(and(...conditions))
		.orderBy(...order, desc(stories.id))
		.limit(size + 1)
		.offset((page - 1) * size);

	const items = rows.slice(0, size);
	const tagMap = await tagsFor(
		db,
		items.map((s) => s.id)
	);
	return {
		items: items.map(
			({ archiveId, archiveUrl, archiveAuthor, archiveAuthorUrl, ratingsTotal, ...s }) => ({
				...s,
				averageRating: averageRating(s.ratingsCount, ratingsTotal),
				archive: archiveOf({ archiveId, archiveUrl, archiveAuthor, archiveAuthorUrl }),
				tags: tagMap.get(s.id) ?? []
			})
		),
		page,
		hasMore: rows.length > size
	};
}

export type Feed = Awaited<ReturnType<typeof feed>>;
export type FeedItem = Feed['items'][number];

export function latestFeed(db: DB, opts: FeedOptions = {}) {
	return feed(db, undefined, [desc(stories.publishedAt)], opts);
}

/** Best-rated first, using a Bayesian average so one 5-fish rating doesn't beat twenty 4.8s. */
export const POPULARITY_PRIOR = { mean: 3.5, weight: 5 };
const popularity = sql`(${stories.ratingsTotal} + ${sql.raw(String(POPULARITY_PRIOR.mean * POPULARITY_PRIOR.weight))}) * 1.0 / (${stories.ratingsCount} + ${sql.raw(String(POPULARITY_PRIOR.weight))})`;

export function popularFeed(db: DB, opts: FeedOptions = {}) {
	return feed(
		db,
		gt(stories.ratingsCount, 0),
		[desc(popularity), desc(stories.ratingsCount)],
		opts
	);
}

export function activeFeed(db: DB, opts: FeedOptions = {}) {
	return feed(db, gt(stories.activityScore, 0), [desc(stories.activityScore)], opts);
}

export function followingFeed(db: DB, userId: number, opts: FeedOptions = {}) {
	const followed = db
		.select({ id: follows.followeeId })
		.from(follows)
		.where(eq(follows.followerId, userId));
	return feed(db, inArray(stories.authorId, followed), [desc(stories.publishedAt)], opts);
}

export function tagFeed(db: DB, tag: string, opts: FeedOptions = {}) {
	const tagged = db
		.select({ id: storyTags.storyId })
		.from(storyTags)
		.innerJoin(tags, eq(tags.id, storyTags.tagId))
		.where(eq(tags.name, tag));
	return feed(db, inArray(stories.id, tagged), [desc(stories.publishedAt)], opts);
}

export function challengeFeed(db: DB, challengeId: number, opts: FeedOptions = {}) {
	return feed(db, eq(stories.challengeId, challengeId), [desc(stories.publishedAt)], opts);
}

/** Stories the user saved to their reading list, most recently saved first. */
export function bookmarksFeed(db: DB, userId: number, opts: FeedOptions = {}) {
	const saved = db
		.select({ id: bookmarks.storyId })
		.from(bookmarks)
		.where(eq(bookmarks.userId, userId));
	const savedAt = db
		.select({ at: bookmarks.createdAt })
		.from(bookmarks)
		.where(and(eq(bookmarks.userId, userId), eq(bookmarks.storyId, stories.id)));
	return feed(db, inArray(stories.id, saved), [sql`(${savedAt}) desc`], opts);
}

/** Stories by one author from the Ficly archive, keyed by their ficly.com author URL. */
export function archiveAuthorFeed(db: DB, authorUrl: string, opts: FeedOptions = {}) {
	return feed(db, eq(stories.archiveAuthorUrl, authorUrl), [desc(stories.publishedAt)], opts);
}

/** Escapes LIKE wildcards so user input matches literally (used with ESCAPE '\\'). */
export function likePattern(query: string): string {
	return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Stories whose title or text contains the query, newest first. */
export function storySearchFeed(db: DB, query: string, opts: FeedOptions = {}) {
	const pattern = likePattern(query.trim());
	return feed(
		db,
		sql`(${stories.title} like ${pattern} escape '\\' or ${stories.body} like ${pattern} escape '\\')`,
		[desc(stories.publishedAt)],
		opts
	);
}

export function authorFeed(db: DB, authorId: number, opts: FeedOptions = {}) {
	return feed(db, eq(stories.authorId, authorId), [desc(stories.publishedAt)], opts);
}
