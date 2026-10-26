import { and, asc, count, desc, eq, gt, inArray, notInArray, sql } from 'drizzle-orm';
import { archiveAuthorPath, ficlyAuthorUrl } from '#lib/archive.ts';
import type { DB } from './db/client';
import { archiveAuthors, archiveFollows, follows, stories, users } from './db/schema';
import { likePattern } from './feeds';

export const AUTHORS_PAGE_SIZE = 30;

/** A writer as shown in author lists: a member here, or an author from the Ficly archive. */
export interface AuthorEntry {
	name: string;
	href: string;
	stories: number;
	avatarUrl: string | null;
	archive: boolean;
	/** Members only. */
	username?: string | null;
}

const publishedCount = sql`(select count(*) from ${stories} where ${stories.authorId} = ${users.id} and ${stories.status} = 'published')`;

/** Recounts these members' published stories. Called whenever a story's status changes. */
export async function syncAuthorCounts(db: DB, userIds: number[]): Promise<void> {
	if (userIds.length === 0) return;
	await db.update(users).set({ publishedCount }).where(inArray(users.id, userIds));
}

/** Recounts every member. The nightly job runs this as a safety net; the import runs it once. */
export async function refreshAllAuthorCounts(db: DB): Promise<void> {
	await db.update(users).set({ publishedCount });
}

/** Members with at least one published story, most prolific first. */
export async function listWriters(
	db: DB,
	opts: { page?: number; pageSize?: number; exclude?: number[]; query?: string } = {}
): Promise<{ items: AuthorEntry[]; hasMore: boolean }> {
	const size = opts.pageSize ?? AUTHORS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const conditions = [eq(users.isArchive, false), gt(users.publishedCount, 0)];
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
			stories: users.publishedCount
		})
		.from(users)
		.where(and(...conditions))
		.orderBy(desc(users.publishedCount), users.displayName)
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

/** How many members have published here, for the authors page. */
export async function countWriters(db: DB): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(users)
		.where(and(eq(users.isArchive, false), gt(users.publishedCount, 0)));
	return n;
}

/**
 * Rebuilds the archive_authors summary from the stories: one row per Ficly author with their
 * published story count and years. The import runs it, and the nightly job keeps it current
 * after moderation. One pass over the archive, instead of one per visitor.
 */
export async function refreshArchiveAuthors(db: DB): Promise<void> {
	await db.delete(archiveAuthors);
	await db.run(sql`
		insert into ${archiveAuthors} (url, name, name_key, stories, first_published_at, last_published_at)
		select ${stories.archiveAuthorUrl}, coalesce(min(${stories.archiveAuthor}), 'Unknown'),
			lower(coalesce(min(${stories.archiveAuthor}), 'Unknown')),
			count(*), min(${stories.publishedAt}), max(${stories.publishedAt})
		from ${stories}
		where ${stories.archiveAuthorUrl} is not null and ${stories.status} = 'published'
		group by ${stories.archiveAuthorUrl}`);
}

/**
 * Authors from the Ficly archive, most prolific first. With a query, those whose name starts
 * with it, matched case-insensitively as a range on the name_key index (INDEXED BY, since the
 * planner otherwise walks every author in story order looking for matches).
 */
export async function listArchiveAuthors(
	db: DB,
	opts: { page?: number; pageSize?: number; query?: string } = {}
): Promise<{ items: AuthorEntry[]; hasMore: boolean }> {
	const size = opts.pageSize ?? AUTHORS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const limit = size + 1;
	const offset = (page - 1) * size;
	type Row = { name: string; url: string; stories: number };
	const query = opts.query?.trim();
	const rows: Row[] = query
		? await db.all<Row>(
				sql`select ${archiveAuthors.name} as name, ${archiveAuthors.url} as url, ${archiveAuthors.stories} as stories
					from ${archiveAuthors} indexed by archive_authors_name_key_idx
					where ${archiveAuthors.nameKey} >= lower(${query}) and ${archiveAuthors.nameKey} < lower(${query}) || char(65535)
					order by ${archiveAuthors.stories} desc, ${archiveAuthors.name} asc limit ${limit} offset ${offset}`
			)
		: await db
				.select({
					name: archiveAuthors.name,
					url: archiveAuthors.url,
					stories: archiveAuthors.stories
				})
				.from(archiveAuthors)
				.orderBy(desc(archiveAuthors.stories), asc(archiveAuthors.name))
				.limit(limit)
				.offset(offset);
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

/**
 * The members and Ficly archive authors a user follows, most recently followed first, with
 * their published story counts.
 */
export async function listFollowing(db: DB, userId: number): Promise<AuthorEntry[]> {
	const [members, archive] = await Promise.all([
		db
			.select({
				username: users.username,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				stories: users.publishedCount,
				followedAt: follows.createdAt
			})
			.from(follows)
			.innerJoin(users, eq(users.id, follows.followeeId))
			.where(eq(follows.followerId, userId)),
		db
			.select({
				url: archiveAuthors.url,
				name: archiveAuthors.name,
				stories: archiveAuthors.stories,
				followedAt: archiveFollows.createdAt
			})
			.from(archiveFollows)
			.innerJoin(archiveAuthors, eq(archiveAuthors.url, archiveFollows.authorUrl))
			.where(eq(archiveFollows.followerId, userId))
	]);
	const entries = [
		...members.map((r) => ({
			followedAt: r.followedAt,
			name: r.displayName,
			username: r.username,
			href: `/@${r.username}`,
			stories: Number(r.stories),
			avatarUrl: r.avatarUrl,
			archive: false
		})),
		...archive.map((r) => ({
			followedAt: r.followedAt,
			name: r.name,
			href: archiveAuthorPath(r.url) ?? r.url,
			stories: r.stories,
			avatarUrl: null,
			archive: true
		}))
	];
	return entries
		.sort((a, b) => b.followedAt.getTime() - a.followedAt.getTime() || a.name.localeCompare(b.name))
		.map(({ followedAt, ...entry }) => (void followedAt, entry));
}
