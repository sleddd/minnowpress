import { and, desc, eq, gt, inArray, sql, type SQL } from 'drizzle-orm';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';
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

/** Joins a feed adds before filtering, e.g. to drive it from a tag or the search index. */
type Extend = (q: SQLiteSelect) => SQLiteSelect;

async function feed(
	db: DB,
	where: SQL | undefined,
	order: SQL[],
	opts: FeedOptions,
	extend: Extend = (q) => q
) {
	const page = Math.max(1, opts.page ?? 1);
	const size = opts.pageSize ?? PAGE_SIZE;
	const conditions = [eq(stories.status, 'published'), where];
	if (!opts.viewer?.showMature) conditions.push(eq(stories.isMature, false));

	const base = db
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
		.innerJoin(users, eq(users.id, stories.authorId));
	// `extend` only adds inner joins, so the rows keep the shape selected above.
	type Row = Awaited<typeof base>[number];
	const rows = (await extend(base.$dynamic())
		.where(and(...conditions))
		.orderBy(...order, desc(stories.id))
		.limit(size + 1)
		.offset((page - 1) * size)) as Row[];

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

/**
 * Best-rated first, by a Bayesian average so one 5-fish rating doesn't beat twenty 4.8s. The
 * average is the stories.popularity column, which SQLite derives from the totals (see the
 * schema) and which is indexed, so this reads only the page it returns.
 */
export const POPULARITY_PRIOR = { mean: 3.5, weight: 5 };

export function popularFeed(db: DB, opts: FeedOptions = {}) {
	return feed(
		db,
		gt(stories.popularity, 0),
		[desc(stories.popularity), desc(stories.ratingsCount)],
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

/** Driven from the tag's own rows, so a tag page reads its stories and nothing else. */
export function tagFeed(db: DB, tag: string, opts: FeedOptions = {}) {
	return feed(db, undefined, [desc(stories.publishedAt)], opts, (q) =>
		q
			.innerJoin(storyTags, eq(storyTags.storyId, stories.id))
			.innerJoin(tags, and(eq(tags.id, storyTags.tagId), eq(tags.name, tag)))
	);
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

/** Most words a search uses; the rest are ignored rather than refused. */
export const SEARCH_MAX_TERMS = 8;

/**
 * Turns what the reader typed into an FTS5 query: each word becomes a quoted prefix term, so
 * "owl su" finds "Owl Suit", and FTS5's own syntax (quotes, operators, parentheses) can never
 * break it. Null when nothing in the query is searchable.
 */
export function ftsQuery(query: string): string | null {
	const terms = query
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean)
		.slice(0, SEARCH_MAX_TERMS);
	return terms.length ? terms.map((t) => `"${t}"*`).join(' ') : null;
}

/**
 * Stories whose title or text contains the words, newest first, through the stories_fts
 * full-text index (migration 0011), so only matching stories are read.
 */
export function storySearchFeed(db: DB, query: string, opts: FeedOptions = {}) {
	const match = ftsQuery(query);
	if (!match)
		return Promise.resolve({ items: [] as FeedItem[], page: opts.page ?? 1, hasMore: false });
	return feed(db, sql`stories_fts match ${match}`, [desc(stories.publishedAt)], opts, (q) =>
		q.innerJoin(sql`stories_fts`, sql`stories_fts.rowid = ${stories.id}`)
	);
}

export function authorFeed(db: DB, authorId: number, opts: FeedOptions = {}) {
	return feed(db, eq(stories.authorId, authorId), [desc(stories.publishedAt)], opts);
}
