import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { averageRating } from '#lib/rating.ts';
import { normalizeBody, validateStoryInput } from '#lib/text.ts';
import type { DB } from './db/client';
import { challenges, stories, storyTags, tags, users, type Story } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

export type Relation = 'sequel' | 'prequel';

export interface StoryInput {
	title: string;
	body: string;
	tags: string[];
	isMature?: boolean;
	challengeId?: number | null;
	publish: boolean;
}

export interface Continuation {
	parentId: number;
	relation: Relation;
}

export const archiveColumns = {
	archiveId: stories.archiveId,
	archiveUrl: stories.archiveUrl,
	archiveAuthor: stories.archiveAuthor,
	archiveAuthorUrl: stories.archiveAuthorUrl
};

export interface ArchiveCredit {
	url: string;
	author: string;
	authorUrl: string | null;
}

/** Attribution for a story imported from the Ficly archive, or null for stories written here. */
export function archiveOf(row: {
	archiveId: number | null;
	archiveUrl: string | null;
	archiveAuthor: string | null;
	archiveAuthorUrl: string | null;
}): ArchiveCredit | null {
	if (row.archiveId === null || !row.archiveUrl) return null;
	return {
		url: row.archiveUrl,
		author: row.archiveAuthor ?? 'Unknown',
		authorUrl: row.archiveAuthorUrl
	};
}

export const authorColumns = {
	id: users.id,
	username: users.username,
	displayName: users.displayName,
	avatarUrl: users.avatarUrl
};

async function setTags(db: DB, storyId: number, names: string[]) {
	await db.delete(storyTags).where(eq(storyTags.storyId, storyId));
	if (names.length === 0) return;
	await db
		.insert(tags)
		.values(names.map((name) => ({ name })))
		.onConflictDoNothing();
	const rows = await db.select().from(tags).where(inArray(tags.name, names));
	await db.insert(storyTags).values(rows.map((t) => ({ storyId, tagId: t.id })));
}

export async function tagsFor(db: DB, storyIds: number[]): Promise<Map<number, string[]>> {
	const map = new Map<number, string[]>();
	if (storyIds.length === 0) return map;
	const rows = await db
		.select({ storyId: storyTags.storyId, name: tags.name })
		.from(storyTags)
		.innerJoin(tags, eq(tags.id, storyTags.tagId))
		.where(inArray(storyTags.storyId, storyIds))
		.orderBy(asc(tags.name));
	for (const row of rows) map.set(row.storyId, [...(map.get(row.storyId) ?? []), row.name]);
	return map;
}

function validate(input: StoryInput) {
	const errors = validateStoryInput(input);
	if (Object.keys(errors).length) throw new ValidationError(errors);
}

/** Stories can answer the current challenge or any past one, just not one that hasn't opened. */
async function assertChallengeOpen(db: DB, challengeId: number) {
	const challenge = await db.query.challenges.findFirst({
		where: eq(challenges.id, challengeId)
	});
	const started =
		challenge?.status === 'approved' &&
		challenge.startsAt !== null &&
		challenge.startsAt.getTime() <= Date.now();
	if (!started) throw new ValidationError({ challenge: 'That challenge hasn’t opened yet.' });
}

export async function createStory(
	db: DB,
	authorId: number,
	input: StoryInput,
	continuation?: Continuation
): Promise<Story> {
	validate(input);
	if (input.challengeId) await assertChallengeOpen(db, input.challengeId);

	let chainId: number | null = null;
	if (continuation) {
		const parent = await db.query.stories.findFirst({
			where: eq(stories.id, continuation.parentId)
		});
		if (!parent || parent.status !== 'published') throw new NotFoundError('Story not found');
		chainId = parent.chainId ?? parent.id;
	}

	const now = new Date();
	const [story] = await db
		.insert(stories)
		.values({
			authorId,
			title: input.title.trim(),
			body: normalizeBody(input.body),
			isMature: input.isMature ?? false,
			challengeId: input.challengeId ?? null,
			parentId: continuation?.parentId ?? null,
			relation: continuation?.relation ?? null,
			chainId,
			status: input.publish ? 'published' : 'draft',
			publishedAt: input.publish ? now : null
		})
		.returning();

	if (chainId === null) {
		await db.update(stories).set({ chainId: story.id }).where(eq(stories.id, story.id));
		story.chainId = story.id;
	}
	await setTags(db, story.id, input.tags);
	return story;
}

/** Writes a prequel or sequel to an existing published story. */
export function continueStory(
	db: DB,
	authorId: number,
	parentId: number,
	relation: Relation,
	input: StoryInput
): Promise<Story> {
	return createStory(db, authorId, input, { parentId, relation });
}

async function ownDraft(db: DB, userId: number, storyId: number): Promise<Story> {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story) throw new NotFoundError('Story not found');
	if (story.authorId !== userId) throw new ForbiddenError();
	if (story.status !== 'draft') throw new ForbiddenError('Published stories cannot be edited.');
	return story;
}

/** The author's own story, draft or published, unless it came from the Ficly archive. */
export async function editableStory(db: DB, userId: number, storyId: number): Promise<Story> {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story || story.status === 'removed') throw new NotFoundError('Story not found');
	if (story.authorId !== userId) throw new ForbiddenError();
	if (story.archiveId !== null)
		throw new ForbiddenError('Stories from the Ficly archive can’t be edited.');
	return story;
}

/**
 * Saves changes to the author's own story. A draft can be published here; a published story
 * stays published and is marked as edited. Ficly archive stories can't be edited.
 */
export async function updateStory(
	db: DB,
	userId: number,
	storyId: number,
	input: StoryInput,
	now = new Date()
): Promise<Story> {
	const existing = await editableStory(db, userId, storyId);
	validate(input);
	if (input.challengeId && input.challengeId !== existing.challengeId)
		await assertChallengeOpen(db, input.challengeId);
	const wasPublished = existing.status === 'published';
	const publish = wasPublished || Boolean(input.publish);
	const [story] = await db
		.update(stories)
		.set({
			title: input.title.trim(),
			body: normalizeBody(input.body),
			isMature: input.isMature ?? false,
			challengeId: input.challengeId ?? null,
			status: publish ? 'published' : 'draft',
			publishedAt: wasPublished ? existing.publishedAt : publish ? now : null,
			editedAt: wasPublished ? now : null
		})
		.where(eq(stories.id, storyId))
		.returning();
	await setTags(db, storyId, input.tags);
	return story;
}

export async function publishStory(db: DB, userId: number, storyId: number): Promise<Story> {
	await ownDraft(db, userId, storyId);
	const [story] = await db
		.update(stories)
		.set({ status: 'published', publishedAt: new Date() })
		.where(eq(stories.id, storyId))
		.returning();
	return story;
}

/**
 * Deletes the author's own story, draft or published, for good: its comments, ratings, tags
 * and saves go with it. Prequels and sequels other people wrote stay up, unlinked from it.
 * Ficly archive stories can't be deleted.
 */
export async function deleteStory(db: DB, userId: number, storyId: number): Promise<void> {
	await editableStory(db, userId, storyId);
	await db.delete(stories).where(eq(stories.id, storyId));
}

/** Moderator action. The row stays so chains keep their shape; it is hidden everywhere. */
export async function removeStory(db: DB, storyId: number): Promise<void> {
	await db.update(stories).set({ status: 'removed' }).where(eq(stories.id, storyId));
}

export async function restoreStory(db: DB, storyId: number): Promise<void> {
	await db
		.update(stories)
		.set({ status: 'published' })
		.where(and(eq(stories.id, storyId), eq(stories.status, 'removed')));
}

async function storySummaries(
	db: DB,
	where: ReturnType<typeof and>,
	order = asc(stories.publishedAt)
) {
	return db
		.select({
			id: stories.id,
			title: stories.title,
			relation: stories.relation,
			parentId: stories.parentId,
			archiveAuthor: stories.archiveAuthor,
			publishedAt: stories.publishedAt,
			ratingsCount: stories.ratingsCount,
			author: authorColumns
		})
		.from(stories)
		.innerJoin(users, eq(users.id, stories.authorId))
		.where(where)
		.orderBy(order);
}

/**
 * A story as the given viewer may see it, with its parent and continuations.
 * Drafts are visible only to their author; removed stories to nobody.
 */
export async function getStory(db: DB, storyId: number, viewerId?: number) {
	const [row] = await db
		.select({ story: stories, author: { ...authorColumns, bio: users.bio } })
		.from(stories)
		.innerJoin(users, eq(users.id, stories.authorId))
		.where(eq(stories.id, storyId));
	if (!row) return null;
	const { story, author } = row;
	if (story.status === 'removed') return null;
	if (story.status === 'draft' && story.authorId !== viewerId) return null;

	const [parent] = story.parentId
		? await storySummaries(db, and(eq(stories.id, story.parentId), eq(stories.status, 'published')))
		: [];
	const continuations = await storySummaries(
		db,
		and(eq(stories.parentId, story.id), eq(stories.status, 'published'))
	);
	const challenge = story.challengeId
		? await db.query.challenges.findFirst({ where: eq(challenges.id, story.challengeId) })
		: undefined;
	const tagMap = await tagsFor(db, [story.id]);
	// The story this one continues sits on the other side: a sequel's parent is its prequel.
	const before = parent && story.relation === 'sequel' ? [parent] : [];
	const after = parent && story.relation === 'prequel' ? [parent] : [];

	return {
		...story,
		author,
		averageRating: averageRating(story.ratingsCount, story.ratingsTotal),
		archive: archiveOf(story),
		tags: tagMap.get(story.id) ?? [],
		parent: parent ?? null,
		sequels: [...after, ...continuations.filter((c) => c.relation === 'sequel')],
		prequels: [...before, ...continuations.filter((c) => c.relation === 'prequel')],
		challenge: challenge ? { id: challenge.id, title: challenge.title } : null
	};
}

export type StoryDetail = NonNullable<Awaited<ReturnType<typeof getStory>>>;

/** Every published story in a chain, oldest first. Shape it with buildChainTree. */
export function getChain(db: DB, chainId: number) {
	return storySummaries(db, and(eq(stories.chainId, chainId), eq(stories.status, 'published')));
}

export async function countPublishedStories(db: DB, authorId: number): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(stories)
		.where(and(eq(stories.authorId, authorId), eq(stories.status, 'published')));
	return n;
}

export async function getUserStories(
	db: DB,
	authorId: number,
	opts: { includeDrafts?: boolean } = {}
) {
	const statuses: Story['status'][] = opts.includeDrafts ? ['published', 'draft'] : ['published'];
	return db
		.select()
		.from(stories)
		.where(and(eq(stories.authorId, authorId), inArray(stories.status, statuses)))
		.orderBy(desc(stories.createdAt), desc(stories.id));
}
