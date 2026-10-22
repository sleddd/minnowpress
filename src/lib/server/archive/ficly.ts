/**
 * Imports the public Ficly archive (github.com/ficly/ficly_export, CC BY-SA 3.0).
 *
 * - Stories are owned by one archive account and credited to their original author, with a
 *   link back to ficly.com. They're published and can't be edited, but anyone can continue them.
 * - Prequel/sequel links and challenge entries are kept.
 * - The import is idempotent: rows are keyed by their Ficly id, so re-running it is safe.
 */
import { count, eq, isNotNull, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { normalizeBody, parseTags, TAG_MAX_COUNT } from '#lib/text.ts';
import { refreshArchiveAuthors } from '../authors';
import type { DB } from '../db/client';
import { challenges, ratings, stories, storyTags, tags, users, type User } from '../db/schema';
import { refreshAllTagCounts } from '../tags';
import { readRows, type SqlRow } from './sqldump';

export const FICLY_ORIGIN = 'https://ficly.com';
export const ARCHIVE_EMAIL = 'archive@ficly.invalid';
export const ARCHIVE_USERNAME = 'ficly_archive';

const TABLES = new Set([
	'users',
	'stories',
	'challenges',
	'challenge_submissions',
	'tags',
	'taggings'
]);

export interface FiclyStory {
	archiveId: number;
	title: string;
	body: string;
	publishedAt: Date;
	isMature: boolean;
	author: string;
	authorUrl: string | null;
	parentArchiveId: number | null;
	relation: 'sequel' | 'prequel' | null;
	challengeArchiveId: number | null;
	tags: string[];
	/** Ficly's own ratings, kept as the story's baseline. */
	ratingsCount: number;
	ratingsTotal: number;
}

export interface FiclyChallenge {
	archiveId: number;
	title: string;
	promptText: string;
	startsAt: Date | null;
	endsAt: Date | null;
}

export interface FiclyDump {
	stories: FiclyStory[];
	challenges: FiclyChallenge[];
}

/** MySQL DATETIME ("2009-05-16 20:41:33"), read as UTC. */
export function mysqlDate(value: unknown): Date | null {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))
		return null;
	const date = new Date(`${value.replace(' ', 'T')}Z`);
	return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 1990 ? null : date;
}

const str = (v: unknown) =>
	typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v);
const num = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null);

/** Reads the parts of the dump we import. Drafts and deleted stories are skipped. */
export async function readFiclyDump(
	lines: AsyncIterable<string> | Iterable<string>
): Promise<FiclyDump> {
	const rows: Record<string, SqlRow[]> = {};
	for await (const { table, row } of readRows(lines, TABLES)) (rows[table] ??= []).push(row);

	const authors = new Map<number, { name: string; url: string | null }>();
	for (const u of rows.users ?? []) {
		const uri = str(u.uri_name);
		authors.set(Number(u.id), {
			name: str(u.name) || 'Unknown',
			url: uri ? `${FICLY_ORIGIN}/authors/${uri}/` : null
		});
	}

	const tagNames = new Map<number, string>();
	for (const t of rows.tags ?? []) tagNames.set(Number(t.id), str(t.name));
	const storyTagNames = new Map<number, string[]>();
	for (const t of rows.taggings ?? []) {
		if (t.taggable_type !== 'Story') continue;
		const name = tagNames.get(Number(t.tag_id));
		if (!name) continue;
		const id = Number(t.taggable_id);
		storyTagNames.set(id, [...(storyTagNames.get(id) ?? []), name]);
	}

	const entries = new Map<number, number>();
	for (const s of rows.challenge_submissions ?? []) {
		const storyId = num(s.story_id);
		const challengeId = num(s.challenge_id);
		if (storyId && challengeId) entries.set(storyId, challengeId);
	}

	const parsed: FiclyStory[] = [];
	for (const s of rows.stories ?? []) {
		const publishedAt = mysqlDate(s.published_at);
		if (s.is_draft || s.is_deleted || !publishedAt) continue;
		const archiveId = Number(s.id);
		const author = authors.get(Number(s.user_id)) ?? { name: 'Unknown', url: null };
		const sequelTo = num(s.sequel_to);
		const prequelTo = num(s.prequel_to);
		parsed.push({
			archiveId,
			title: str(s.title).trim() || 'Untitled',
			body: normalizeBody(str(s.body)),
			publishedAt,
			isMature: Boolean(s.is_mature),
			author: author.name,
			authorUrl: author.url,
			parentArchiveId: sequelTo ?? prequelTo,
			relation: sequelTo ? 'sequel' : prequelTo ? 'prequel' : null,
			challengeArchiveId: entries.get(archiveId) ?? null,
			ratingsCount: Math.max(0, Number(s.ratings_count) || 0),
			ratingsTotal: Math.max(0, Number(s.total_ratings_score) || 0),
			tags: parseTags((storyTagNames.get(archiveId) ?? []).join(',')).slice(0, TAG_MAX_COUNT)
		});
	}
	parsed.sort((a, b) => a.archiveId - b.archiveId);

	const parsedChallenges: FiclyChallenge[] = (rows.challenges ?? []).map((c) => ({
		archiveId: Number(c.id),
		title: str(c.title).trim() || 'Untitled challenge',
		promptText: normalizeBody(str(c.body)),
		startsAt: mysqlDate(c.starts_at) ?? mysqlDate(c.created_at),
		endsAt: mysqlDate(c.ends_at)
	}));

	return { stories: parsed, challenges: parsedChallenges };
}

/**
 * The root of each story's chain, following parent links. Stories whose parent isn't in the
 * import are roots. Cycles (bad data) are broken by treating the repeated story as a root.
 */
export function chainRoots(links: Map<number, number | null>): Map<number, number> {
	const roots = new Map<number, number>();
	for (const start of links.keys()) {
		const path: number[] = [];
		const seen = new Set<number>();
		let current = start;
		let root: number | undefined;
		while (root === undefined) {
			const known = roots.get(current);
			if (known !== undefined) root = known;
			else {
				path.push(current);
				seen.add(current);
				const parent = links.get(current);
				if (parent === null || parent === undefined || !links.has(parent) || seen.has(parent))
					root = current;
				else current = parent;
			}
		}
		for (const id of path) roots.set(id, root);
	}
	return roots;
}

export async function ensureArchiveUser(db: DB): Promise<User> {
	const existing = await db.query.users.findFirst({ where: eq(users.isArchive, true) });
	if (existing) return existing;
	const [user] = await db
		.insert(users)
		.values({
			email: ARCHIVE_EMAIL,
			username: ARCHIVE_USERNAME,
			displayName: 'Ficly Archive',
			bio: 'Stories from Ficly (2009–2014), credited to their original authors and shared under CC BY-SA 3.0.',
			website: FICLY_ORIGIN,
			isArchive: true
		})
		.returning();
	return user;
}

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

async function runBatches(db: DB, statements: BatchItem<'sqlite'>[], size: number) {
	for (const group of chunk(statements, size)) {
		await db.batch(group as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
	}
}

export interface ImportResult {
	stories: number;
	challenges: number;
	linked: number;
}

export async function importFicly(
	db: DB,
	dump: FiclyDump,
	opts: { batchSize?: number; log?: (msg: string) => void } = {}
): Promise<ImportResult> {
	const size = opts.batchSize ?? 200;
	const log = opts.log ?? (() => {});
	const archive = await ensureArchiveUser(db);

	// Challenges: past prompts, shown as closed.
	const [{ n: before }] = await db
		.select({ n: count() })
		.from(challenges)
		.where(isNotNull(challenges.archiveId));
	await runBatches(
		db,
		chunk(dump.challenges, size).map((group) =>
			db
				.insert(challenges)
				.values(
					group.map((c) => ({
						title: c.title,
						promptText: c.promptText,
						source: 'human' as const,
						status: 'approved' as const,
						startsAt: c.startsAt,
						endsAt: c.endsAt,
						archiveId: c.archiveId,
						archiveUrl: `${FICLY_ORIGIN}/challenges/${c.archiveId}/`
					}))
				)
				.onConflictDoNothing()
		),
		1
	);
	const challengeIds = new Map(
		(
			await db
				.select({ id: challenges.id, archiveId: challenges.archiveId })
				.from(challenges)
				.where(isNotNull(challenges.archiveId))
		).map((c) => [c.archiveId!, c.id])
	);
	log(`challenges: ${challengeIds.size}`);

	// Stories.
	const [{ n: storiesBefore }] = await db
		.select({ n: count() })
		.from(stories)
		.where(isNotNull(stories.archiveId));
	await runBatches(
		db,
		chunk(dump.stories, size).map((group) =>
			db
				.insert(stories)
				.values(
					group.map((s) => ({
						authorId: archive.id,
						title: s.title,
						body: s.body,
						status: 'published' as const,
						isMature: s.isMature,
						publishedAt: s.publishedAt,
						createdAt: s.publishedAt,
						archiveId: s.archiveId,
						archiveUrl: `${FICLY_ORIGIN}/stories/${s.archiveId}/`,
						archiveAuthor: s.author,
						archiveAuthorUrl: s.authorUrl
					}))
				)
				.onConflictDoNothing()
		),
		1
	);
	const storyIds = new Map(
		(
			await db
				.select({ id: stories.id, archiveId: stories.archiveId })
				.from(stories)
				.where(isNotNull(stories.archiveId))
		).map((s) => [s.archiveId!, s.id])
	);
	log(`stories: ${storyIds.size}`);

	// Parent links, chains, and challenge entries.
	const links = new Map<number, number | null>();
	for (const s of dump.stories) links.set(s.archiveId, s.parentArchiveId);
	const roots = chainRoots(links);
	let linked = 0;
	const updates: BatchItem<'sqlite'>[] = [];
	for (const s of dump.stories) {
		const id = storyIds.get(s.archiveId);
		if (!id) continue;
		const parentId = s.parentArchiveId ? (storyIds.get(s.parentArchiveId) ?? null) : null;
		const isChild = parentId !== null && roots.get(s.archiveId) !== s.archiveId;
		if (isChild) linked++;
		updates.push(
			db
				.update(stories)
				.set({
					parentId: isChild ? parentId : null,
					relation: isChild ? s.relation : null,
					chainId: storyIds.get(roots.get(s.archiveId)!) ?? id,
					challengeId: s.challengeArchiveId
						? (challengeIds.get(s.challengeArchiveId) ?? null)
						: null,
					archiveRatingsCount: s.ratingsCount,
					archiveRatingsTotal: s.ratingsTotal,
					// Baseline plus any ratings members have added since the last import.
					ratingsCount: sql`${s.ratingsCount} + (select count(*) from ${ratings} where ${ratings.storyId} = ${id})`,
					ratingsTotal: sql`${s.ratingsTotal} + (select coalesce(sum(${ratings.score}), 0) from ${ratings} where ${ratings.storyId} = ${id})`
				})
				.where(eq(stories.id, id))
		);
	}
	await runBatches(db, updates, 500);
	log(`linked continuations: ${linked}`);

	// Tags.
	const allTags = [...new Set(dump.stories.flatMap((s) => s.tags))];
	await runBatches(
		db,
		chunk(allTags, size).map((group) =>
			db
				.insert(tags)
				.values(group.map((name) => ({ name })))
				.onConflictDoNothing()
		),
		1
	);
	const tagIds = new Map((await db.select().from(tags)).map((t) => [t.name, t.id]));
	const pairs = dump.stories.flatMap((s) => {
		const storyId = storyIds.get(s.archiveId);
		return storyId ? s.tags.map((t) => ({ storyId, tagId: tagIds.get(t)! })) : [];
	});
	await runBatches(
		db,
		chunk(pairs, size).map((group) => db.insert(storyTags).values(group).onConflictDoNothing()),
		1
	);
	log(`tags: ${allTags.length}`);

	// The summaries the directory pages read from.
	await refreshAllTagCounts(db);
	await refreshArchiveAuthors(db);
	log('summaries refreshed');

	return {
		stories: storyIds.size - storiesBefore,
		challenges: challengeIds.size - before,
		linked
	};
}
