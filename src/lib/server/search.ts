import { and, count, eq, gt, lt } from 'drizzle-orm';
import { listArchiveAuthors, listWriters } from './authors';
import type { DB } from './db/client';
import { searchRequests } from './db/schema';
import { storySearchFeed, type FeedOptions } from './feeds';
import { tagIndex } from './tags';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

/**
 * Searches one network address can run per window. A search scans every story, so this is a
 * ceiling on how much database work an anonymous visitor can cause.
 */
export const SEARCH_LIMITS = { perAddress: 40, windowMinutes: 5 };
export const SEARCH_LIMIT_MESSAGE =
	'You’re searching faster than we allow. Try again in a few minutes.';

/**
 * Records a search and says whether it's within the limit. Recorded before it's counted, so a
 * burst of parallel searches can't slip under; a refused search still counts.
 */
export async function allowSearch(db: DB, ip: string, now = new Date()): Promise<boolean> {
	const since = new Date(now.getTime() - SEARCH_LIMITS.windowMinutes * 60_000);
	await db.delete(searchRequests).where(lt(searchRequests.createdAt, since));
	await db.insert(searchRequests).values({ ip, createdAt: now });
	const [{ n }] = await db
		.select({ n: count() })
		.from(searchRequests)
		.where(and(eq(searchRequests.ip, ip), gt(searchRequests.createdAt, since)));
	return n <= SEARCH_LIMITS.perAddress;
}

/** Trims and bounds a raw query; null when it's too short to search. */
export function normalizeQuery(raw: string | null | undefined): string | null {
	const q = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, SEARCH_MAX_LENGTH);
	return q.length >= SEARCH_MIN_LENGTH ? q : null;
}

/** Searches story titles and text, author names (members and archive), and tags. */
export async function searchAll(db: DB, query: string, opts: FeedOptions = {}) {
	const [stories, writers, archiveAuthors, tags] = await Promise.all([
		storySearchFeed(db, query, opts),
		listWriters(db, { query, pageSize: 8 }),
		listArchiveAuthors(db, { query, pageSize: 8 }),
		tagIndex(db, { query })
	]);
	return {
		query,
		stories,
		authors: [...writers.items, ...archiveAuthors.items],
		tags: tags.items.slice(0, 20)
	};
}
