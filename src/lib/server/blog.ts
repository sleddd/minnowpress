import { and, desc, eq, like, lt, ne, or } from 'drizzle-orm';
import { countGraphemes } from '#lib/text.ts';
import type { DB } from './db/client';
import { blogPosts, users, type BlogPost } from './db/schema';
import { NotFoundError, ValidationError } from './errors';

export const BLOG_TITLE_MAX = 150;
export const BLOG_BODY_MAX = 20_000;
export const BLOG_PAGE_SIZE = 10;

export interface PostInput {
	title: string;
	body: string;
	publish: boolean;
}

/** "Hello, Ficly fans!" → "hello-ficly-fans" */
export function slugify(title: string): string {
	return (
		title
			.normalize('NFKD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60)
			.replace(/-+$/, '') || 'post'
	);
}

function validate(input: PostInput) {
	const errors: Record<string, string> = {};
	const title = countGraphemes(input.title.trim(), BLOG_TITLE_MAX);
	const body = countGraphemes(input.body.trim(), BLOG_BODY_MAX);
	if (title === 0) errors.title = 'Give the post a title.';
	else if (title > BLOG_TITLE_MAX)
		errors.title = `Titles are ${BLOG_TITLE_MAX} characters or less.`;
	if (body === 0) errors.body = 'Write the post.';
	else if (body > BLOG_BODY_MAX) errors.body = `Posts are ${BLOG_BODY_MAX} characters or less.`;
	if (Object.keys(errors).length) throw new ValidationError(errors);
}

/** A slug from the title that no other post uses: "news", "news-2", "news-3"… */
async function uniqueSlug(db: DB, title: string, exceptId?: number): Promise<string> {
	const base = slugify(title);
	const taken = new Set(
		(
			await db
				.select({ slug: blogPosts.slug })
				.from(blogPosts)
				.where(
					and(
						or(eq(blogPosts.slug, base), like(blogPosts.slug, `${base}-%`)),
						exceptId ? ne(blogPosts.id, exceptId) : undefined
					)
				)
		).map((r) => r.slug)
	);
	let slug = base;
	for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
	return slug;
}

export async function createPost(db: DB, authorId: number, input: PostInput): Promise<BlogPost> {
	validate(input);
	const [post] = await db
		.insert(blogPosts)
		.values({
			slug: await uniqueSlug(db, input.title),
			title: input.title.trim(),
			body: input.body.trim(),
			authorId,
			status: input.publish ? 'published' : 'draft',
			publishedAt: input.publish ? new Date() : null
		})
		.returning();
	return post;
}

/** Edits a post. The slug follows the title only while the post is still a draft, so links don't break. */
export async function updatePost(db: DB, id: number, input: PostInput): Promise<BlogPost> {
	validate(input);
	const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
	if (!existing) throw new NotFoundError('Post not found');
	const firstPublish = input.publish && existing.status === 'draft';
	const [post] = await db
		.update(blogPosts)
		.set({
			title: input.title.trim(),
			body: input.body.trim(),
			slug: existing.status === 'draft' ? await uniqueSlug(db, input.title, id) : existing.slug,
			status: input.publish ? 'published' : 'draft',
			publishedAt: input.publish ? (firstPublish ? new Date() : existing.publishedAt) : null,
			updatedAt: new Date()
		})
		.where(eq(blogPosts.id, id))
		.returning();
	return post;
}

export async function deletePost(db: DB, id: number): Promise<void> {
	const removed = await db
		.delete(blogPosts)
		.where(eq(blogPosts.id, id))
		.returning({ id: blogPosts.id });
	if (removed.length === 0) throw new NotFoundError('Post not found');
}

const postColumns = {
	id: blogPosts.id,
	slug: blogPosts.slug,
	title: blogPosts.title,
	body: blogPosts.body,
	status: blogPosts.status,
	publishedAt: blogPosts.publishedAt,
	updatedAt: blogPosts.updatedAt,
	author: users.displayName,
	authorUsername: users.username
};

export async function getPost(db: DB, id: number) {
	const [row] = await db
		.select(postColumns)
		.from(blogPosts)
		.leftJoin(users, eq(users.id, blogPosts.authorId))
		.where(eq(blogPosts.id, id));
	return row ?? null;
}

export async function getPublishedPost(db: DB, slug: string) {
	const [row] = await db
		.select(postColumns)
		.from(blogPosts)
		.leftJoin(users, eq(users.id, blogPosts.authorId))
		.where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')));
	return row ?? null;
}

export type BlogPostView = NonNullable<Awaited<ReturnType<typeof getPost>>>;

/** The published post just before this one, for the "Earlier" link at the foot of a post. */
export async function previousPost(db: DB, post: { id: number; publishedAt: Date | null }) {
	if (!post.publishedAt) return null;
	const [row] = await db
		.select({ slug: blogPosts.slug, title: blogPosts.title })
		.from(blogPosts)
		.where(
			and(
				eq(blogPosts.status, 'published'),
				or(
					lt(blogPosts.publishedAt, post.publishedAt),
					and(eq(blogPosts.publishedAt, post.publishedAt), lt(blogPosts.id, post.id))
				)
			)
		)
		.orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
		.limit(1);
	return row ?? null;
}

export async function listPublishedPosts(db: DB, opts: { page?: number } = {}) {
	const page = Math.max(1, opts.page ?? 1);
	const rows = await db
		.select(postColumns)
		.from(blogPosts)
		.leftJoin(users, eq(users.id, blogPosts.authorId))
		.where(eq(blogPosts.status, 'published'))
		.orderBy(desc(blogPosts.publishedAt), desc(blogPosts.id))
		.limit(BLOG_PAGE_SIZE + 1)
		.offset((page - 1) * BLOG_PAGE_SIZE);
	return { items: rows.slice(0, BLOG_PAGE_SIZE), page, hasMore: rows.length > BLOG_PAGE_SIZE };
}

/** Every post, drafts first, for the admin list. */
export function listAllPosts(db: DB) {
	return db
		.select(postColumns)
		.from(blogPosts)
		.leftJoin(users, eq(users.id, blogPosts.authorId))
		.orderBy(desc(eq(blogPosts.status, 'draft')), desc(blogPosts.updatedAt), desc(blogPosts.id));
}
