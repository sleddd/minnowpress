import { and, desc, eq, gt, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';
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
	extend: Extend = (q) => q,
	/** Whether to break ties by story id. Off when `order` is already total, so an index can serve it whole. */
	tiebreak = true,
	/**
	 * For feeds driven by another table (the people you follow): keeps the planner from walking
	 * every published story newest first, hoping to meet a match. The unary + makes the status
	 * test unusable by an index, so the feed is driven from its own rows instead.
	 */
	drivenElsewhere = false
) {
	const page = Math.max(1, opts.page ?? 1);
	const size = opts.pageSize ?? PAGE_SIZE;
	const published = drivenElsewhere
		? sql`+${stories.status} = 'published'`
		: eq(stories.status, 'published');
	const conditions = [published, where];
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
		.orderBy(...order, ...(tiebreak ? [desc(stories.id)] : []))
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

/** The Ficly archive's last story was published before this; every later one was written here. */
export const ARCHIVE_ENDED = new Date('2015-07-01T00:00:00Z');

/**
 * Stories written on MinnowPress, newest first, leaving out the Ficly archive. The date bound
 * lets the (status, published_at) index stop where the archive starts, so a short list doesn't
 * walk 32,000 archive stories looking for more.
 */
export function memberFeed(db: DB, opts: FeedOptions = {}) {
	return feed(
		db,
		and(gt(stories.publishedAt, ARCHIVE_ENDED), isNull(stories.archiveId)),
		[desc(stories.publishedAt)],
		opts
	);
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

/**
 * Ficly archive stories that someone continued, best-rated first: the chains that grew back
 * then, for topping up Active while few chains are growing here. Walks the popularity index
 * and checks each story for a sequel or prequel through the parent index.
 */
export function archiveChainsFeed(db: DB, opts: FeedOptions = {}) {
	return feed(
		db,
		and(
			gt(stories.popularity, 0),
			isNotNull(stories.archiveId),
			sql`exists (select 1 from stories c where c.parent_id = ${stories.id} and c.status = 'published')`
		),
		[desc(stories.popularity), desc(stories.ratingsCount)],
		opts
	);
}

/**
 * Driven from the member's follows: each followed writer's stories come off the
 * (author, status, published_at) index, so this reads those writers' stories and nothing else.
 */
export function followingFeed(db: DB, userId: number, opts: FeedOptions = {}) {
	return feed(
		db,
		undefined,
		[desc(stories.publishedAt)],
		opts,
		(q) =>
			q.innerJoin(
				follows,
				and(eq(follows.followeeId, stories.authorId), eq(follows.followerId, userId))
			),
		true,
		true
	);
}

/**
 * Driven from the tag's own rows, newest story first by id, which the (tag, story) index
 * serves in order: a tag page reads one page of its stories, however big the tag is. Ids
 * follow publication order closely enough (the archive was imported in order; new stories
 * get rising ids), and this is the one feed that can't afford to sort by date.
 */
export function tagFeed(db: DB, tag: string, opts: FeedOptions = {}) {
	return feed(
		db,
		undefined,
		[desc(storyTags.storyId)],
		opts,
		(q) =>
			q
				.innerJoin(storyTags, eq(storyTags.storyId, stories.id))
				.innerJoin(tags, and(eq(tags.id, storyTags.tagId), eq(tags.name, tag))),
		false
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
