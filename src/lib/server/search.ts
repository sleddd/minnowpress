import { listArchiveAuthors, listWriters } from './authors';
import type { DB } from './db/client';
import { storySearchFeed, type FeedOptions } from './feeds';
import { tagIndex } from './tags';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;

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
