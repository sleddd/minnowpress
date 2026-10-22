import { and, count, desc, eq, isNotNull, notInArray, sql } from 'drizzle-orm';
import { archiveAuthorPath, ficlyAuthorUrl } from '#lib/archive.ts';
import type { DB } from './db/client';
import { follows, stories, users } from './db/schema';
import { likePattern } from './feeds';

export const AUTHORS_PAGE_SIZE = 30;

/** A writer as shown in author lists: a member here, or an author from the Ficly archive. */
export interface AuthorEntry {
	name: string;
	href: string;
	stories: number;
	avatarUrl: string | null;
	archive: boolean;
	/** Members only; archive authors can't be followed. */
	username?: string | null;
}

const storyCount = count(stories.id);

/** Members with at least one published story, most prolific first. */
export async function listWriters(
	db: DB,
	opts: { page?: number; pageSize?: number; exclude?: number[]; query?: string } = {}
): Promise<{ items: AuthorEntry[]; hasMore: boolean }> {
	const size = opts.pageSize ?? AUTHORS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const conditions = [eq(users.isArchive, false), eq(stories.status, 'published')];
	if (opts.exclude?.length) conditions.push(notInArray(users.id, opts.exclude));
	if (opts.query) {
		const pattern = likePattern(opts.query);
		conditions.push(
			sql`(${users.displayName} like ${pattern} escape '\\' or ${users.username} like ${pattern} escape '\\')`
		);
	}
	const rows = await db
		.select({
			username: users.username,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			stories: storyCount
		})
		.from(users)
		.innerJoin(stories, eq(stories.authorId, users.id))
		.where(and(...conditions))
		.groupBy(users.id)
		.orderBy(desc(storyCount), users.displayName)
		.limit(size + 1)
		.offset((page - 1) * size);
	return {
		items: rows.slice(0, size).map((r) => ({
			name: r.displayName,
			username: r.username,
			href: `/@${r.username}`,
			stories: r.stories,
			avatarUrl: r.avatarUrl,
			archive: false
		})),
		hasMore: rows.length > size
	};
}

/** Authors from the Ficly archive, most prolific first. */
export async function listArchiveAuthors(
	db: DB,
	opts: { page?: number; pageSize?: number; query?: string } = {}
): Promise<{ items: AuthorEntry[]; hasMore: boolean }> {
	const size = opts.pageSize ?? AUTHORS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const conditions = [isNotNull(stories.archiveAuthorUrl), eq(stories.status, 'published')];
	if (opts.query)
		conditions.push(sql`${stories.archiveAuthor} like ${likePattern(opts.query)} escape '\\'`);
	const rows = await db
		.select({ name: stories.archiveAuthor, url: stories.archiveAuthorUrl, stories: storyCount })
		.from(stories)
		.where(and(...conditions))
		.groupBy(stories.archiveAuthorUrl)
		.orderBy(desc(storyCount), stories.archiveAuthor)
		.limit(size + 1)
		.offset((page - 1) * size);
	return {
		items: rows.slice(0, size).flatMap((r) => {
			const href = archiveAuthorPath(r.url);
			return href
				? [{ name: r.name ?? 'Unknown', href, stories: r.stories, avatarUrl: null, archive: true }]
				: [];
		}),
		hasMore: rows.length > size
	};
}

export async function getArchiveAuthor(db: DB, slug: string) {
	const url = ficlyAuthorUrl(slug.toLowerCase());
	const [row] = await db
		.select({
			name: stories.archiveAuthor,
			stories: storyCount,
			first: sql<number | null>`min(${stories.publishedAt})`,
			last: sql<number | null>`max(${stories.publishedAt})`
		})
		.from(stories)
		.where(and(eq(stories.archiveAuthorUrl, url), eq(stories.status, 'published')));
	if (!row || row.stories === 0) return null;
	const year = (ms: number | null) => (ms === null ? null : new Date(Number(ms)).getUTCFullYear());
	return {
		name: row.name ?? 'Unknown',
		url,
		stories: row.stories,
		firstYear: year(row.first),
		lastYear: year(row.last)
	};
}

/**
 * Suggestions for the home page: active members the viewer doesn't follow yet,
 * topped up with well-known archive authors while the community is young.
 */
export async function authorsToFollow(
	db: DB,
	opts: { viewerId?: number | null; limit?: number } = {}
): Promise<AuthorEntry[]> {
	const limit = opts.limit ?? 3;
	const exclude: number[] = [];
	if (opts.viewerId) {
		exclude.push(opts.viewerId);
		const followed = await db
			.select({ id: follows.followeeId })
			.from(follows)
			.where(eq(follows.followerId, opts.viewerId));
		exclude.push(...followed.map((f) => f.id));
	}
	const writers = (await listWriters(db, { pageSize: limit, exclude })).items;
	if (writers.length >= limit) return writers;
	const archive = (await listArchiveAuthors(db, { pageSize: limit - writers.length })).items;
	return [...writers, ...archive];
}

/** The members a user follows, most recently followed first, with their published story counts. */
export async function listFollowing(db: DB, userId: number): Promise<AuthorEntry[]> {
	const published = sql<number>`(select count(*) from stories s where s.author_id = ${users.id} and s.status = 'published')`;
	const rows = await db
		.select({
			username: users.username,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			stories: published
		})
		.from(follows)
		.innerJoin(users, eq(users.id, follows.followeeId))
		.where(eq(follows.followerId, userId))
		.orderBy(desc(follows.createdAt), users.displayName);
	return rows.map((r) => ({
		name: r.displayName,
		username: r.username,
		href: `/@${r.username}`,
		stories: Number(r.stories),
		avatarUrl: r.avatarUrl,
		archive: false
	}));
}
