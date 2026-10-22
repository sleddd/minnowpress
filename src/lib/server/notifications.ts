import { and, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm';
import { excerpt } from '#lib/format.ts';
import type { DB } from './db/client';
import { comments, follows, stories, users } from './db/schema';
import type { Email, SendEmail } from './email';

export interface NotifyContext {
	send: SendEmail;
	/** Canonical site origin for links, e.g. https://minnowpress.com */
	origin: string;
	appName: string;
}

const DAY = 24 * 60 * 60 * 1000;
export const DIGEST_MAX_STORIES = 10;

const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

function email(
	ctx: NotifyContext,
	to: string,
	subject: string,
	lines: { text: string; url?: string }[]
): Email {
	const settings = `${ctx.origin}/settings`;
	const text = [
		...lines.map((l) => (l.url ? `${l.text}\n${l.url}` : l.text)),
		`—\nChoose which emails you get: ${settings}`
	].join('\n\n');
	const html = [
		...lines.map((l) =>
			l.url
				? `<p><a href="${escapeHtml(l.url)}">${escapeHtml(l.text)}</a></p>`
				: `<p>${escapeHtml(l.text)}</p>`
		),
		`<p style="color:#6b6258;font-size:13px">Choose which emails you get: <a href="${escapeHtml(settings)}">settings</a></p>`
	].join('');
	return { to, subject: `${subject} · ${ctx.appName}`, text, html };
}

/** Emails a story's author about a new comment, unless they wrote it or opted out. */
export async function notifyComment(
	db: DB,
	ctx: NotifyContext,
	commentId: number
): Promise<boolean> {
	const [row] = await db
		.select({ comment: comments, story: stories })
		.from(comments)
		.innerJoin(stories, eq(stories.id, comments.storyId))
		.where(eq(comments.id, commentId));
	if (!row || row.comment.authorId === row.story.authorId) return false;

	const [author, commenter] = await Promise.all([
		db.query.users.findFirst({ where: eq(users.id, row.story.authorId) }),
		db.query.users.findFirst({ where: eq(users.id, row.comment.authorId) })
	]);
	if (!author || !commenter || author.isArchive || !author.notifyComments) return false;

	await ctx.send(
		email(ctx, author.email, `${commenter.displayName} commented on “${row.story.title}”`, [
			{ text: `${commenter.displayName} wrote:` },
			{ text: excerpt(row.comment.body, 500) },
			{ text: 'Read the comment', url: `${ctx.origin}/s/${row.story.id}` }
		])
	);
	return true;
}

/** Emails a story's author when someone publishes a prequel or sequel to it. */
export async function notifyContinuation(
	db: DB,
	ctx: NotifyContext,
	storyId: number
): Promise<boolean> {
	const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
	if (!story?.parentId || story.status !== 'published') return false;
	const parent = await db.query.stories.findFirst({ where: eq(stories.id, story.parentId) });
	if (!parent || parent.authorId === story.authorId) return false;

	const [author, writer] = await Promise.all([
		db.query.users.findFirst({ where: eq(users.id, parent.authorId) }),
		db.query.users.findFirst({ where: eq(users.id, story.authorId) })
	]);
	if (!author || !writer || author.isArchive || !author.notifyContinuations) return false;

	await ctx.send(
		email(
			ctx,
			author.email,
			`${writer.displayName} wrote a ${story.relation} to “${parent.title}”`,
			[
				{
					text: `Your story “${parent.title}” has a new ${story.relation}: “${story.title}” by ${writer.displayName}.`
				},
				// The author of the parent hasn't necessarily chosen to read mature stories.
				{
					text:
						story.isMature && !author.showMature
							? 'It’s marked mature, so it isn’t quoted here.'
							: excerpt(story.body, 300)
				},
				{ text: `Read the ${story.relation}`, url: `${ctx.origin}/s/${story.id}` }
			]
		)
	);
	return true;
}

/** Runs a notification without letting an email failure break the user's action. */
export async function deliverSafely(
	task: () => Promise<unknown>,
	log = console.error
): Promise<void> {
	try {
		await task();
	} catch (e) {
		log('Notification failed', e);
	}
}

/**
 * Sends each opted-in reader a digest of the past week's stories from writers they follow.
 * Returns the number of emails sent.
 */
export async function sendWeeklyDigests(
	db: DB,
	ctx: NotifyContext,
	now = new Date()
): Promise<number> {
	const since = new Date(now.getTime() - 7 * DAY);
	const readers = await db
		.select()
		.from(users)
		.where(and(eq(users.notifyDigest, true), eq(users.isArchive, false)));

	let sent = 0;
	for (const reader of readers) {
		const followed = db
			.select({ id: follows.followeeId })
			.from(follows)
			.where(eq(follows.followerId, reader.id));
		const conditions = [
			eq(stories.status, 'published'),
			inArray(stories.authorId, followed),
			ne(stories.authorId, reader.id),
			gte(stories.publishedAt, since),
			lt(stories.publishedAt, now)
		];
		if (!reader.showMature) conditions.push(eq(stories.isMature, false));
		const recent = await db
			.select({ id: stories.id, title: stories.title, author: users.displayName })
			.from(stories)
			.innerJoin(users, eq(users.id, stories.authorId))
			.where(and(...conditions))
			.orderBy(desc(stories.publishedAt))
			.limit(DIGEST_MAX_STORIES);
		if (recent.length === 0) continue;

		await ctx.send(
			email(ctx, reader.email, 'This week from writers you follow', [
				{
					text: `${recent.length === 1 ? 'A new story' : `${recent.length} new stories`} from writers you follow:`
				},
				...recent.map((s) => ({ text: `${s.title} — ${s.author}`, url: `${ctx.origin}/s/${s.id}` }))
			])
		);
		sent++;
	}
	return sent;
}
