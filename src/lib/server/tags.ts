import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { DB } from './db/client';
import { stories, storyTags, tags } from './db/schema';
import { likePattern } from './feeds';

export const TAGS_PAGE_SIZE = 120;

export interface TagCount {
	name: string;
	count: number;
}

const storyCount = count(stories.id);

async function tagCounts(
	db: DB,
	opts: { limit: number; offset?: number; query?: string; includeMature?: boolean }
): Promise<TagCount[]> {
	const conditions = [eq(stories.status, 'published')];
	if (!opts.includeMature) conditions.push(eq(stories.isMature, false));
	if (opts.query) conditions.push(sql`${tags.name} like ${likePattern(opts.query)} escape '\\'`);
	return db
		.select({ name: tags.name, count: storyCount })
		.from(tags)
		.innerJoin(storyTags, eq(storyTags.tagId, tags.id))
		.innerJoin(stories, eq(stories.id, storyTags.storyId))
		.where(and(...conditions))
		.groupBy(tags.id)
		.orderBy(desc(storyCount), tags.name)
		.limit(opts.limit)
		.offset(opts.offset ?? 0);
}

/** The most-used tags on published stories. */
export function popularTags(db: DB, limit = 6): Promise<TagCount[]> {
	return tagCounts(db, { limit });
}

/** All tags in use, most-used first, a page at a time. */
export async function tagIndex(db: DB, opts: { page?: number; query?: string } = {}) {
	const page = Math.max(1, opts.page ?? 1);
	const rows = await tagCounts(db, {
		limit: TAGS_PAGE_SIZE + 1,
		offset: (page - 1) * TAGS_PAGE_SIZE,
		query: opts.query,
		includeMature: true
	});
	return { items: rows.slice(0, TAGS_PAGE_SIZE), page, hasMore: rows.length > TAGS_PAGE_SIZE };
}
