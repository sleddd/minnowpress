export const STORY_MAX = 1024;
export const STORY_MIN = 60;
export const COMMENT_MAX = 1024;
export const TITLE_MAX = 100;
export const TAG_MAX_COUNT = 5;
export const TAG_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
/** Names that would read as the site or its staff speaking. Nobody can take them. */
export const RESERVED_USERNAMES = new Set([
	'abuse',
	'admin',
	'administrator',
	'anonymous',
	'archive',
	'ficly',
	'help',
	'hello',
	'minnowpress',
	'mod',
	'moderator',
	'moderators',
	'no_reply',
	'noreply',
	'official',
	'postmaster',
	'root',
	'security',
	'staff',
	'support',
	'system',
	'team',
	'webmaster'
]);

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Counts user-perceived characters, so an emoji or an accented letter counts as one. Counting
 * stops at `limit + 1`, so checking a huge submission costs no more than checking one just over.
 */
export function countGraphemes(text: string, limit = Infinity): number {
	const graphemes = segmenter.segment(text)[Symbol.iterator]();
	let n = 0;
	while (n <= limit && !graphemes.next().done) n++;
	return n;
}

export function normalizeBody(text: string): string {
	return text.replace(/\r\n?/g, '\n').trim();
}

export type FieldErrors = Partial<Record<'title' | 'body' | 'tags', string>>;

export function validateStoryBody(body: string): string | undefined {
	const length = countGraphemes(normalizeBody(body), STORY_MAX);
	if (length === 0) return 'Write something first.';
	if (length < STORY_MIN)
		return `Stories need at least ${STORY_MIN} characters (this is ${length}).`;
	if (length > STORY_MAX)
		return `Stories are ${STORY_MAX} characters or less (this is ${length} or more).`;
}

export function validateTitle(title: string): string | undefined {
	const length = countGraphemes(title.trim(), TITLE_MAX);
	if (length === 0) return 'Give it a title.';
	if (length > TITLE_MAX) return `Titles are ${TITLE_MAX} characters or less.`;
}

export function validateComment(body: string): string | undefined {
	const length = countGraphemes(normalizeBody(body), COMMENT_MAX);
	if (length === 0) return 'Comment is empty.';
	if (length > COMMENT_MAX) return `Comments are ${COMMENT_MAX} characters or less.`;
}

/** "Sci-Fi, space opera,  sci-fi" → ["sci-fi", "space-opera"] */
export function parseTags(input: string): string[] {
	const seen = new Set<string>();
	for (const raw of input.split(',')) {
		const tag = raw
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\p{L}\p{N}-]/gu, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
		if (tag) seen.add(tag);
	}
	return [...seen];
}

export function validateTags(tags: string[]): string | undefined {
	if (tags.length > TAG_MAX_COUNT) return `Up to ${TAG_MAX_COUNT} tags.`;
	if (tags.some((t) => t.length > TAG_MAX_LENGTH))
		return `Tags are ${TAG_MAX_LENGTH} characters or less.`;
}

export function validateStoryInput(input: {
	title: string;
	body: string;
	tags: string[];
}): FieldErrors {
	const errors: FieldErrors = {};
	const title = validateTitle(input.title);
	const body = validateStoryBody(input.body);
	const tags = validateTags(input.tags);
	if (title) errors.title = title;
	if (body) errors.body = body;
	if (tags) errors.tags = tags;
	return errors;
}

export function validateUsername(username: string): string | undefined {
	if (!USERNAME_PATTERN.test(username))
		return '3–20 characters: lowercase letters, numbers and underscores.';
}
