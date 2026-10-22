import { and, eq } from 'drizzle-orm';
import type { DB } from './db/client';
import { bookmarks, stories } from './db/schema';
import { NotFoundError } from './errors';

export async function isBookmarked(db: DB, userId: number, storyId: number): Promise<boolean> {
	const row = await db.query.bookmarks.findFirst({
		where: and(eq(bookmarks.userId, userId), eq(bookmarks.storyId, storyId))
	});
	return Boolean(row);
}

/** Adds a published story to the user's reading list, or removes it. */
export async function toggleBookmark(db: DB, userId: number, storyId: number) {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story || story.status !== 'published') throw new NotFoundError('Story not found');

	const bookmarked = !(await isBookmarked(db, userId, storyId));
	if (bookmarked) await db.insert(bookmarks).values({ userId, storyId });
	else
		await db
			.delete(bookmarks)
			.where(and(eq(bookmarks.userId, userId), eq(bookmarks.storyId, storyId)));
	return { bookmarked };
}
