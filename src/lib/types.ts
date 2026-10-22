/** View shapes passed from load functions to components. Client-safe: no server imports. */

export interface AuthorView {
	id: number;
	username: string;
	displayName: string;
	avatarUrl: string | null;
}

export interface Viewer {
	id: number;
	username: string;
	displayName: string;
	avatarUrl: string | null;
	role: 'user' | 'mod' | 'admin';
	showMature: boolean;
}

export type Relation = 'sequel' | 'prequel';

/** Credit for a story imported from the Ficly archive. */
export interface ArchiveCreditView {
	url: string;
	author: string;
	authorUrl: string | null;
}

export interface StorySummary {
	id: number;
	title: string;
	relation: Relation | null;
	parentId: number | null;
	author: AuthorView;
	/** Original author's name for archive stories. */
	archiveAuthor?: string | null;
	publishedAt?: Date | null;
	ratingsCount?: number;
}

export interface FeedItemView {
	id: number;
	title: string;
	body: string;
	isMature: boolean;
	relation: Relation | null;
	parentId: number | null;
	ratingsCount: number;
	averageRating: number | null;
	commentsCount: number;
	publishedAt: Date | null;
	author: AuthorView;
	archive: ArchiveCreditView | null;
	tags: string[];
}

export interface StoryDetailView {
	id: number;
	title: string;
	body: string;
	status: 'draft' | 'published' | 'removed';
	isMature: boolean;
	relation: Relation | null;
	chainId: number | null;
	ratingsCount: number;
	averageRating: number | null;
	commentsCount: number;
	publishedAt: Date | null;
	/** Set when the author changed it after publishing. */
	editedAt?: Date | null;
	createdAt: Date;
	author: AuthorView & { bio?: string | null };
	archive: ArchiveCreditView | null;
	tags: string[];
	parent: StorySummary | null;
	sequels: StorySummary[];
	prequels: StorySummary[];
	challenge: { id: number; title: string } | null;
}

export interface CommentView {
	id: number;
	body: string;
	createdAt: Date;
	author: AuthorView;
}

export interface ChallengeView {
	id: number;
	title: string;
	promptText: string;
	source: 'ai' | 'human';
	startsAt: Date | null;
	endsAt: Date | null;
	entries?: number;
	isOpen?: boolean;
	/** Set on challenges imported from the Ficly archive. */
	archiveUrl?: string | null;
	/** Approved but not open yet; its page is a preview. */
	upcoming?: boolean;
	/** The member who proposed it; null for AI and admin prompts. */
	creator?: { username: string; displayName: string } | null;
}

export interface PendingPromptView {
	id: number;
	title: string;
	promptText: string;
	source: 'ai' | 'human';
	createdAt: Date;
}

export interface ReportView {
	id: number;
	targetType: 'story' | 'comment';
	targetId: number;
	reason: 'ai_generated' | 'spam' | 'abuse' | 'other';
	note: string;
	createdAt: Date;
	reporter: string;
	target: { title: string; body: string; storyId: number } | null;
}

export interface ProfileView {
	username: string;
	displayName: string;
	bio: string;
	website: string | null;
	avatarUrl: string | null;
	createdAt: Date;
}

export interface PasskeyView {
	id: string;
	name: string;
	createdAt: Date;
	lastUsedAt: Date | null;
}

export interface NotificationPrefsView {
	notifyComments: boolean;
	notifyContinuations: boolean;
	notifyDigest: boolean;
}

export interface TabView {
	href: string;
	label: string;
	current: boolean;
}

/** A writer in author lists: a member, or an author from the Ficly archive. */
export interface AuthorEntryView {
	name: string;
	href: string;
	stories: number;
	avatarUrl: string | null;
	archive: boolean;
	/** Members only; archive authors can't be followed. */
	username?: string | null;
}

export interface TagCountView {
	name: string;
	count: number;
}

export interface BlogPostView {
	id: number;
	slug: string;
	title: string;
	body: string;
	status: 'draft' | 'published';
	publishedAt: Date | null;
	updatedAt: Date;
	author: string | null;
	authorUsername?: string | null;
}

export interface ActivityEventView {
	kind: 'comment' | 'sequel' | 'prequel';
	at: Date;
	actor: { username: string; displayName: string };
	story: { id: number; title: string };
	continuation: { id: number; title: string } | null;
}

export interface SessionView {
	id: string;
	device: string;
	signedInAt: Date | null;
	lastUsedAt: Date | null;
	expiresAt: Date;
	current: boolean;
}
