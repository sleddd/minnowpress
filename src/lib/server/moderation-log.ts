import { desc, eq, inArray } from 'drizzle-orm';
import type { DB } from './db/client';
import {
	challenges,
	comments,
	moderationLog,
	stories,
	users,
	type ModerationLogEntry
} from './db/schema';

export type ModerationAction = ModerationLogEntry['action'];
export type ModerationTarget = ModerationLogEntry['targetType'];

export interface ModerationLogInput {
	actorId: number;
	action: ModerationAction;
	targetType: ModerationTarget;
	targetId: number;
	/** The report that led to this, if any. */
	reportId?: number | null;
}

/** Records who did what. Every moderator action writes one line here. */
export async function logModeration(db: DB, entry: ModerationLogInput): Promise<void> {
	await db.insert(moderationLog).values({ ...entry, reportId: entry.reportId ?? null });
}

export const MODERATION_LOG_PAGE_SIZE = 50;

const unique = (ids: number[]) => [...new Set(ids)];

/** Moderator actions, newest first, with the moderator's name and a link to what was acted on. */
export async function listModerationLog(db: DB, opts: { page?: number } = {}) {
	const page = Math.max(1, opts.page ?? 1);
	const rows = await db
		.select({ entry: moderationLog, actor: users.username })
		.from(moderationLog)
		.leftJoin(users, eq(users.id, moderationLog.actorId))
		.orderBy(desc(moderationLog.createdAt), desc(moderationLog.id))
		.limit(MODERATION_LOG_PAGE_SIZE + 1)
		.offset((page - 1) * MODERATION_LOG_PAGE_SIZE);
	const items = rows.slice(0, MODERATION_LOG_PAGE_SIZE);
	const idsOf = (type: ModerationTarget) =>
		unique(items.filter((r) => r.entry.targetType === type).map((r) => r.entry.targetId));

	const [storyIds, commentIds, userIds, challengeIds] = [
		idsOf('story'),
		idsOf('comment'),
		idsOf('user'),
		idsOf('challenge')
	];
	const [storyRows, commentRows, userRows, challengeRows] = await Promise.all([
		storyIds.length
			? db
					.select({ id: stories.id, title: stories.title })
					.from(stories)
					.where(inArray(stories.id, storyIds))
			: [],
		commentIds.length
			? db
					.select({ id: comments.id, storyId: comments.storyId })
					.from(comments)
					.where(inArray(comments.id, commentIds))
			: [],
		userIds.length
			? db
					.select({ id: users.id, username: users.username })
					.from(users)
					.where(inArray(users.id, userIds))
			: [],
		challengeIds.length
			? db
					.select({ id: challenges.id, title: challenges.title })
					.from(challenges)
					.where(inArray(challenges.id, challengeIds))
			: []
	]);
	const titles = new Map(storyRows.map((s) => [s.id, s.title]));
	const commentStories = new Map(commentRows.map((c) => [c.id, c.storyId]));
	const names = new Map(userRows.map((u) => [u.id, u.username]));
	const challengeTitles = new Map(challengeRows.map((c) => [c.id, c.title]));

	const target = ({ targetType, targetId }: ModerationLogEntry) => {
		if (targetType === 'story') {
			const title = titles.get(targetId);
			return { label: title ?? `Story #${targetId}`, href: title ? `/s/${targetId}` : null };
		}
		// A removed challenge has no page left to link to.
		if (targetType === 'challenge')
			return { label: challengeTitles.get(targetId) ?? `Challenge #${targetId}`, href: null };
		if (targetType === 'comment') {
			const storyId = commentStories.get(targetId);
			return { label: `Comment #${targetId}`, href: storyId ? `/s/${storyId}` : null };
		}
		const name = names.get(targetId);
		return { label: name ? `@${name}` : `Member #${targetId}`, href: name ? `/@${name}` : null };
	};

	return {
		items: items.map(({ entry, actor }) => ({
			id: entry.id,
			action: entry.action,
			targetType: entry.targetType,
			targetId: entry.targetId,
			reportId: entry.reportId,
			createdAt: entry.createdAt,
			actor: actor ?? null,
			target: target(entry)
		})),
		page,
		hasMore: rows.length > MODERATION_LOG_PAGE_SIZE
	};
}

export type ModerationLogItem = Awaited<ReturnType<typeof listModerationLog>>['items'][number];
