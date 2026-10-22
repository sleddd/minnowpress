import { asc, desc, gt, inArray, sql } from 'drizzle-orm';
import type { DB } from './db/client';
import { tags } from './db/schema';
import { parseTags } from '#lib/text.ts';

export const TAGS_PAGE_SIZE = 120;

export interface TagCount {
	name: string;
	count: number;
}

/**
 * Zeroes the counts of the tags in `scope`, then sets them from one grouped pass over their
 * story_tags rows. One pass, not one scan per tag: a per-tag subquery made SQLite walk every
 * story for every tag.
 */
async function recount(db: DB, tagIds: number[] | undefined) {
	const ids =
		tagIds &&
		sql.join(
			tagIds.map((id) => sql`${id}`),
			sql`, `
		);
	await db
		.update(tags)
		.set({ publishedCount: 0, generalCount: 0 })
		.where(ids ? inArray(tags.id, tagIds) : undefined);
	await db.run(sql`
		update tags set published_count = c.published, general_count = c.general
		from (
			select st.tag_id as tag_id, count(*) as published,
				sum(case when s.is_mature = 0 then 1 else 0 end) as general
			from story_tags st join stories s on s.id = st.story_id
			where s.status = 'published' ${ids ? sql`and st.tag_id in (${ids})` : sql``}
			group by st.tag_id
		) as c
		where c.tag_id = tags.id`);
}

/** Recounts the stories behind these tags. Called whenever a story's tags or status change. */
export async function syncTagCounts(db: DB, tagIds: number[]): Promise<void> {
	if (tagIds.length === 0) return;
	await recount(db, tagIds);
}

/** Recounts every tag. The nightly job runs this as a safety net; the import runs it once. */
export async function refreshAllTagCounts(db: DB): Promise<void> {
	await recount(db, undefined);
}

/** The most-used tags on published, non-mature stories. */
export function popularTags(db: DB, limit = 6): Promise<TagCount[]> {
	return db
		.select({ name: tags.name, count: tags.generalCount })
		.from(tags)
		.where(gt(tags.generalCount, 0))
		.orderBy(desc(tags.generalCount), asc(tags.name))
		.limit(limit);
}

/**
 * The tag-name prefix a search query means, folded the way tag names are (lowercase letters,
 * digits and hyphens, see parseTags), or null when nothing in the query could be a tag.
 */
export function tagPrefix(query: string): string | null {
	return parseTags(query)[0] ?? null;
}

/**
 * All tags in use (mature stories included), most-used first, a page at a time. With a query,
 * tags whose name starts with it, read as a range on the name index: that is spelled out with
 * INDEXED BY, because the planner otherwise walks every tag in count order looking for matches.
 */
export async function tagIndex(db: DB, opts: { page?: number; query?: string } = {}) {
	const page = Math.max(1, opts.page ?? 1);
	const limit = TAGS_PAGE_SIZE + 1;
	const offset = (page - 1) * TAGS_PAGE_SIZE;
	let rows: TagCount[];
	if (opts.query) {
		const prefix = tagPrefix(opts.query);
		rows = prefix
			? await db.all<TagCount>(
					sql`select ${tags.name} as name, ${tags.publishedCount} as count from ${tags} indexed by tags_name_unique
						where ${tags.name} >= ${prefix} and ${tags.name} < ${prefix + '\uffff'} and ${tags.publishedCount} > 0
						order by ${tags.publishedCount} desc, ${tags.name} asc limit ${limit} offset ${offset}`
				)
			: [];
	} else
		rows = await db
			.select({ name: tags.name, count: tags.publishedCount })
			.from(tags)
			.where(gt(tags.publishedCount, 0))
			.orderBy(desc(tags.publishedCount), asc(tags.name))
			.limit(limit)
			.offset(offset);
	return { items: rows.slice(0, TAGS_PAGE_SIZE), page, hasMore: rows.length > TAGS_PAGE_SIZE };
}
