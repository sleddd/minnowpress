import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import { normalizeBody, validateComment } from '#lib/text.ts';
import type { DB } from './db/client';
import { comments, follows, stories, users } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import { assertUnderHourlyLimit } from './limits';
import { logModeration } from './moderation-log';
import { authorColumns } from './stories';

async function publishedStory(db: DB, storyId: number) {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story || story.status !== 'published') throw new NotFoundError('Story not found');
	return story;
}

export async function follow(db: DB, followerId: number, followeeId: number): Promise<void> {
	if (followerId === followeeId) throw new ForbiddenError('You cannot follow yourself.');
	const target = await db.query.users.findFirst({ where: eq(users.id, followeeId) });
	if (!target) throw new NotFoundError('User not found');
	await db.insert(follows).values({ followerId, followeeId }).onConflictDoNothing();
}

export async function unfollow(db: DB, followerId: number, followeeId: number): Promise<void> {
	await db
		.delete(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)));
}

export async function isFollowing(
	db: DB,
	followerId: number,
	followeeId: number
): Promise<boolean> {
	const row = await db.query.follows.findFirst({
		where: and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId))
	});
	return Boolean(row);
}

export async function followCounts(db: DB, userId: number) {
	const [[followers], [following]] = await Promise.all([
		db.select({ n: count() }).from(follows).where(eq(follows.followeeId, userId)),
		db.select({ n: count() }).from(follows).where(eq(follows.followerId, userId))
	]);
	return { followers: followers.n, following: following.n };
}

async function syncCommentCount(db: DB, storyId: number) {
	await db
		.update(stories)
		.set({
			commentsCount: sql`(select count(*) from ${comments} where ${comments.storyId} = ${storyId} and ${comments.deletedAt} is null)`
		})
		.where(eq(stories.id, storyId));
}

export async function addComment(db: DB, authorId: number, storyId: number, body: string) {
	const error = validateComment(body);
	if (error) throw new ValidationError({ body: error });
	await publishedStory(db, storyId);
	const [comment] = await db
		.insert(comments)
		.values({ storyId, authorId, body: normalizeBody(body) })
		.returning();
	try {
		await assertUnderHourlyLimit(db, 'comment', authorId);
	} catch (e) {
		await db.delete(comments).where(eq(comments.id, comment.id));
		throw e;
	}
	await syncCommentCount(db, storyId);
	return comment;
}

/**
 * Soft-deletes a comment. Allowed for its author, or a moderator; a moderator deleting someone
 * else's comment is logged, with the report it answers if there is one.
 */
export async function deleteComment(
	db: DB,
	userId: number,
	commentId: number,
	opts: { asModerator?: boolean; reportId?: number | null } = {}
): Promise<void> {
	const comment = await db.query.comments.findFirst({ where: eq(comments.id, commentId) });
	if (!comment || comment.deletedAt) throw new NotFoundError('Comment not found');
	if (comment.authorId !== userId && !opts.asModerator) throw new ForbiddenError();
	await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, commentId));
	await syncCommentCount(db, comment.storyId);
	if (opts.asModerator && comment.authorId !== userId)
		await logModeration(db, {
			actorId: userId,
			action: 'delete_comment',
			targetType: 'comment',
			targetId: commentId,
			reportId: opts.reportId
		});
}

export function listComments(db: DB, storyId: number) {
	return db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			author: authorColumns
		})
		.from(comments)
		.innerJoin(users, eq(users.id, comments.authorId))
		.where(and(eq(comments.storyId, storyId), isNull(comments.deletedAt)))
		.orderBy(asc(comments.createdAt), asc(comments.id));
}

export type CommentView = Awaited<ReturnType<typeof listComments>>[number];
