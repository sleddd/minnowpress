import { and, asc, count, desc, eq, notInArray, sql } from 'drizzle-orm';
import { archiveAuthorPath, ficlyAuthorUrl } from '#lib/archive.ts';
import type { DB } from './db/client';
import { archiveAuthors, follows, stories, users } from './db/schema';
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

/**
 * Rebuilds the archive_authors summary from the stories: one row per Ficly author with their
 * published story count and years. The import runs it, and the nightly job keeps it current
 * after moderation. One pass over the archive, instead of one per visitor.
 */
export async function refreshArchiveAuthors(db: DB): Promise<void> {
	await db.delete(archiveAuthors);
	await db.run(sql`
		insert into ${archiveAuthors} (url, name, stories, first_published_at, last_published_at)
		select ${stories.archiveAuthorUrl}, coalesce(min(${stories.archiveAuthor}), 'Unknown'),
			count(*), min(${stories.publishedAt}), max(${stories.publishedAt})
		from ${stories}
		where ${stories.archiveAuthorUrl} is not null and ${stories.status} = 'published'
		group by ${stories.archiveAuthorUrl}`);
}

/** Authors from the Ficly archive, most prolific first. */
export async function listArchiveAuthors(
	db: DB,
	opts: { page?: number; pageSize?: number; query?: string } = {}
): Promise<{ items: AuthorEntry[]; hasMore: boolean }> {
	const size = opts.pageSize ?? AUTHORS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const rows = await db
		.select({ name: archiveAuthors.name, url: archiveAuthors.url, stories: archiveAuthors.stories })
		.from(archiveAuthors)
		.where(
			opts.query
				? sql`${archiveAuthors.name} like ${likePattern(opts.query)} escape '\\'`
				: undefined
		)
		.orderBy(desc(archiveAuthors.stories), asc(archiveAuthors.name))
		.limit(size + 1)
		.offset((page - 1) * size);
	return {
		items: rows.slice(0, size).flatMap((r) => {
			const href = archiveAuthorPath(r.url);
			return href
				? [{ name: r.name, href, stories: r.stories, avatarUrl: null, archive: true }]
				: [];
		}),
		hasMore: rows.length > size
	};
}

export async function getArchiveAuthor(db: DB, slug: string) {
	const url = ficlyAuthorUrl(slug.toLowerCase());
	const row = await db.query.archiveAuthors.findFirst({ where: eq(archiveAuthors.url, url) });
	if (!row || row.stories === 0) return null;
	const year = (d: Date | null) => d?.getUTCFullYear() ?? null;
	return {
		name: row.name,
		url,
		stories: row.stories,
		firstYear: year(row.firstPublishedAt),
		lastYear: year(row.lastPublishedAt)
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
