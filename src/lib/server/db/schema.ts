import { sql } from 'drizzle-orm';
import {
	type AnySQLiteColumn,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date());

export const users = sqliteTable(
	'users',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		email: text('email').notNull().unique(),
		username: text('username').notNull().unique(),
		// The name before the last rename, held for a while so nobody else can take it at once.
		formerUsername: text('former_username'),
		usernameChangedAt: integer('username_changed_at', { mode: 'timestamp_ms' }),
		displayName: text('display_name').notNull(),
		bio: text('bio').notNull().default(''),
		website: text('website'),
		avatarUrl: text('avatar_url'),
		showMature: integer('show_mature', { mode: 'boolean' }).notNull().default(false),
		role: text('role', { enum: ['user', 'mod', 'admin'] })
			.notNull()
			.default('user'),
		// Email preferences
		notifyComments: integer('notify_comments', { mode: 'boolean' }).notNull().default(true),
		notifyContinuations: integer('notify_continuations', { mode: 'boolean' })
			.notNull()
			.default(true),
		notifyDigest: integer('notify_digest', { mode: 'boolean' }).notNull().default(false),
		// Color theme: light by default; auto follows the system; dark is always dark.
		theme: text('theme', { enum: ['auto', 'light', 'dark'] })
			.notNull()
			.default('light'),
		// The system account that owns imported archive stories; it never signs in or gets email.
		isArchive: integer('is_archive', { mode: 'boolean' }).notNull().default(false),
		// Set by a moderator: the member is signed out everywhere and can't sign back in.
		suspendedAt: integer('suspended_at', { mode: 'timestamp_ms' }),
		createdAt: createdAt()
	},
	(t) => [index('users_former_username_idx').on(t.formerUsername)]
);

export const passkeys = sqliteTable(
	'passkeys',
	{
		// WebAuthn credential id (base64url)
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		publicKey: text('public_key').notNull(),
		counter: integer('counter').notNull().default(0),
		transports: text('transports', { mode: 'json' }).$type<string[]>(),
		name: text('name').notNull(),
		createdAt: createdAt(),
		lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('passkeys_user_idx').on(t.userId)]
);

export const sessions = sqliteTable('sessions', {
	// sha256 of the session token; the raw token only ever lives in the cookie
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
	// For the "Where you're signed in" list in Settings
	signedInAt: integer('signed_in_at', { mode: 'timestamp_ms' }).$defaultFn(() => new Date()),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
	userAgent: text('user_agent')
});

/** Recent sign-in link requests, for rate limiting by network address and email. Rows older than an hour are pruned. */
export const loginRequests = sqliteTable(
	'login_requests',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		ip: text('ip').notNull(),
		email: text('email').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('login_requests_ip_idx').on(t.ip, t.createdAt),
		index('login_requests_email_idx').on(t.email, t.createdAt)
	]
);

/** Recent searches by network address, for rate limiting. Rows older than the window are pruned. */
export const searchRequests = sqliteTable(
	'search_requests',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		ip: text('ip').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('search_requests_ip_idx').on(t.ip, t.createdAt)]
);

export const loginTokens = sqliteTable('login_tokens', {
	// sha256 of the magic-link token
	tokenHash: text('token_hash').primaryKey(),
	email: text('email').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

export const challenges = sqliteTable(
	'challenges',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		title: text('title').notNull(),
		promptText: text('prompt_text').notNull(),
		source: text('source', { enum: ['ai', 'human'] }).notNull(),
		status: text('status', { enum: ['pending', 'approved', 'rejected'] })
			.notNull()
			.default('pending'),
		createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
		approvedBy: integer('approved_by').references(() => users.id, { onDelete: 'set null' }),
		startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
		endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
		featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
		// Set on challenges imported from the Ficly archive
		archiveId: integer('archive_id'),
		archiveUrl: text('archive_url'),
		createdAt: createdAt()
	},
	(t) => [
		index('challenges_status_starts_idx').on(t.status, t.startsAt),
		uniqueIndex('challenges_archive_idx').on(t.archiveId)
	]
);

export const stories = sqliteTable(
	'stories',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		authorId: integer('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		body: text('body').notNull(),
		status: text('status', { enum: ['draft', 'published', 'removed'] })
			.notNull()
			.default('draft'),
		isMature: integer('is_mature', { mode: 'boolean' }).notNull().default(false),
		parentId: integer('parent_id').references((): AnySQLiteColumn => stories.id, {
			onDelete: 'set null'
		}),
		relation: text('relation', { enum: ['sequel', 'prequel'] }),
		// id of the root story of the connected tree; equals own id for roots
		chainId: integer('chain_id'),
		challengeId: integer('challenge_id').references(() => challenges.id, {
			onDelete: 'set null'
		}),
		// Ratings (1–5 fish). Totals include the archive baseline imported from Ficly.
		ratingsCount: integer('ratings_count').notNull().default(0),
		ratingsTotal: integer('ratings_total').notNull().default(0),
		archiveRatingsCount: integer('archive_ratings_count').notNull().default(0),
		archiveRatingsTotal: integer('archive_ratings_total').notNull().default(0),
		commentsCount: integer('comments_count').notNull().default(0),
		activityScore: real('activity_score').notNull().default(0),
		// Bayesian average rating (prior: 5 ratings of 3.5), kept by SQLite itself and indexed so
		// the popular feed never scans the table. Zero until someone rates.
		popularity: real('popularity').generatedAlwaysAs(
			sql`case when ratings_count > 0 then (ratings_total + 17.5) * 1.0 / (ratings_count + 5) else 0 end`,
			{ mode: 'virtual' }
		),
		// Set on stories imported from the Ficly archive (CC BY-SA 3.0, credited to the original author)
		archiveId: integer('archive_id'),
		archiveUrl: text('archive_url'),
		archiveAuthor: text('archive_author'),
		archiveAuthorUrl: text('archive_author_url'),
		createdAt: createdAt(),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		// Set when the author changes a story after publishing it.
		editedAt: integer('edited_at', { mode: 'timestamp_ms' })
	},
	(t) => [
		uniqueIndex('stories_archive_idx').on(t.archiveId),
		index('stories_status_published_idx').on(t.status, t.publishedAt),
		index('stories_author_idx').on(t.authorId),
		index('stories_parent_idx').on(t.parentId),
		index('stories_chain_idx').on(t.chainId),
		index('stories_activity_idx').on(t.activityScore),
		index('stories_challenge_idx').on(t.challengeId),
		index('stories_popularity_idx').on(t.status, t.popularity),
		index('stories_archive_author_idx').on(t.archiveAuthorUrl, t.status, t.publishedAt)
	]
);

/**
 * One row per Ficly author, summarised from their stories so the authors directory never scans
 * the archive. Rebuilt by the import and the nightly job.
 */
export const archiveAuthors = sqliteTable(
	'archive_authors',
	{
		url: text('url').primaryKey(),
		name: text('name').notNull(),
		stories: integer('stories').notNull(),
		firstPublishedAt: integer('first_published_at', { mode: 'timestamp_ms' }),
		lastPublishedAt: integer('last_published_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('archive_authors_stories_idx').on(t.stories)]
);

export const comments = sqliteTable(
	'comments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		storyId: integer('story_id')
			.notNull()
			.references(() => stories.id, { onDelete: 'cascade' }),
		authorId: integer('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		body: text('body').notNull(),
		createdAt: createdAt(),
		deletedAt: integer('deleted_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('comments_story_idx').on(t.storyId)]
);

export const ratings = sqliteTable(
	'ratings',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		storyId: integer('story_id')
			.notNull()
			.references(() => stories.id, { onDelete: 'cascade' }),
		/** 1–5 fish */
		score: integer('score').notNull(),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [primaryKey({ columns: [t.userId, t.storyId] }), index('ratings_story_idx').on(t.storyId)]
);

export const bookmarks = sqliteTable(
	'bookmarks',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		storyId: integer('story_id')
			.notNull()
			.references(() => stories.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.storyId] })]
);

export const follows = sqliteTable(
	'follows',
	{
		followerId: integer('follower_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		followeeId: integer('followee_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.followerId, t.followeeId] })]
);

export const tags = sqliteTable(
	'tags',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull().unique(),
		// Published stories carrying the tag, and those of them that aren't mature. Kept by
		// syncTagCounts whenever a story's tags or status change, so tag lists never scan.
		publishedCount: integer('published_count').notNull().default(0),
		generalCount: integer('general_count').notNull().default(0)
	},
	(t) => [
		index('tags_published_count_idx').on(t.publishedCount),
		index('tags_general_count_idx').on(t.generalCount)
	]
);

export const storyTags = sqliteTable(
	'story_tags',
	{
		storyId: integer('story_id')
			.notNull()
			.references(() => stories.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.storyId, t.tagId] }), index('story_tags_tag_idx').on(t.tagId)]
);

export const reports = sqliteTable(
	'reports',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		reporterId: integer('reporter_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		targetType: text('target_type', { enum: ['story', 'comment'] }).notNull(),
		targetId: integer('target_id').notNull(),
		reason: text('reason', { enum: ['ai_generated', 'spam', 'abuse', 'other'] }).notNull(),
		note: text('note').notNull().default(''),
		status: text('status', { enum: ['open', 'resolved', 'dismissed'] })
			.notNull()
			.default('open'),
		resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' })
	},
	(t) => [index('reports_status_idx').on(t.status)]
);

/** When each on-demand job last ran, so a page can refresh something only when it's stale. */
export const jobRuns = sqliteTable('job_runs', {
	name: text('name').primaryKey(),
	ranAt: integer('ran_at', { mode: 'timestamp_ms' }).notNull()
});

export const MODERATION_ACTIONS = [
	'remove_story',
	'restore_story',
	'delete_comment',
	'suspend_user',
	'unsuspend_user',
	'dismiss_report'
] as const;

/** Who did what, as a moderator. Rows are never deleted. */
export const moderationLog = sqliteTable(
	'moderation_log',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
		action: text('action', { enum: MODERATION_ACTIONS }).notNull(),
		targetType: text('target_type', { enum: ['story', 'comment', 'user'] }).notNull(),
		targetId: integer('target_id').notNull(),
		// The report that led to the action, if any
		reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [index('moderation_log_created_idx').on(t.createdAt)]
);

export const blogPosts = sqliteTable(
	'blog_posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		/** Plain text; blank lines separate paragraphs. Never rendered as HTML. */
		body: text('body').notNull(),
		authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
		status: text('status', { enum: ['draft', 'published'] })
			.notNull()
			.default('draft'),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		createdAt: createdAt(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('blog_posts_status_published_idx').on(t.status, t.publishedAt)]
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type User = typeof users.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Passkey = typeof passkeys.$inferSelect;
export type ModerationLogEntry = typeof moderationLog.$inferSelect;
export type ArchiveAuthor = typeof archiveAuthors.$inferSelect;
