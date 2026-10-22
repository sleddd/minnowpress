import { beforeEach, describe, expect, it } from 'vitest';
import {
	BLOG_PAGE_SIZE,
	createPost,
	deletePost,
	getPost,
	getPublishedPost,
	previousPost,
	listAllPosts,
	listPublishedPosts,
	slugify,
	updatePost
} from './blog';
import type { DB } from './db/client';
import { NotFoundError, ValidationError } from './errors';
import { createTestDb, makeUser } from './testing/db';

let db: DB;
let admin: { id: number };
const post = (o = {}) => ({
	title: 'Hello, Ficly fans!',
	body: 'We are back.',
	publish: true,
	...o
});

beforeEach(async () => {
	db = await createTestDb();
	admin = await makeUser(db, { role: 'admin', displayName: 'Editor' });
});

describe('slugify', () => {
	it('makes URL-safe slugs', () => {
		expect(slugify('Hello, Ficly fans!')).toBe('hello-ficly-fans');
		expect(slugify('Café  au lait')).toBe('cafe-au-lait');
		expect(slugify('!!!')).toBe('post');
		expect(slugify('x'.repeat(100))).toHaveLength(60);
	});
});

describe('createPost', () => {
	it('publishes with a unique slug', async () => {
		const a = await createPost(db, admin.id, post());
		const b = await createPost(db, admin.id, post());
		const c = await createPost(db, admin.id, post());
		expect([a.slug, b.slug, c.slug]).toEqual([
			'hello-ficly-fans',
			'hello-ficly-fans-2',
			'hello-ficly-fans-3'
		]);
		expect(a.status).toBe('published');
		expect(a.publishedAt).toBeInstanceOf(Date);
	});

	it('saves drafts and validates', async () => {
		const draft = await createPost(db, admin.id, post({ publish: false }));
		expect(draft).toMatchObject({ status: 'draft', publishedAt: null });
		await expect(createPost(db, admin.id, post({ title: ' ' }))).rejects.toThrow(ValidationError);
		await expect(createPost(db, admin.id, post({ body: '' }))).rejects.toThrow(ValidationError);
		await expect(createPost(db, admin.id, post({ title: 'x'.repeat(151) }))).rejects.toThrow(
			ValidationError
		);
		await expect(createPost(db, admin.id, post({ body: 'x'.repeat(20_001) }))).rejects.toThrow(
			ValidationError
		);
	});
});

describe('updatePost', () => {
	it('re-slugs drafts but keeps published slugs and dates', async () => {
		const draft = await createPost(db, admin.id, post({ publish: false }));
		const renamed = await updatePost(db, draft.id, post({ title: 'New Name', publish: false }));
		expect(renamed.slug).toBe('new-name');
		const published = await updatePost(db, draft.id, post({ title: 'New Name' }));
		expect(published.publishedAt).toBeInstanceOf(Date);
		const edited = await updatePost(db, draft.id, post({ title: 'Changed Again' }));
		expect(edited.slug).toBe('new-name');
		expect(edited.publishedAt?.getTime()).toBe(published.publishedAt?.getTime());
		const unpublished = await updatePost(db, draft.id, post({ publish: false }));
		expect(unpublished).toMatchObject({ status: 'draft', publishedAt: null });
		await expect(updatePost(db, 999, post())).rejects.toThrow(NotFoundError);
	});
});

describe('reading posts', () => {
	it('shows published posts publicly and every post to admins', async () => {
		const pub = await createPost(db, admin.id, post());
		const draft = await createPost(db, admin.id, post({ title: 'Draft', publish: false }));
		expect((await getPublishedPost(db, pub.slug))?.author).toBe('Editor');
		expect(await getPublishedPost(db, draft.slug)).toBeNull();
		expect((await getPost(db, draft.id))?.title).toBe('Draft');
		expect(await getPost(db, 999)).toBeNull();
		expect((await listPublishedPosts(db)).items.map((p) => p.id)).toEqual([pub.id]);
		expect((await listAllPosts(db)).map((p) => p.id)).toEqual([draft.id, pub.id]);
	});

	it('paginates published posts newest first', async () => {
		for (let i = 0; i < BLOG_PAGE_SIZE + 1; i++)
			await createPost(db, admin.id, post({ title: `P${i}` }));
		const first = await listPublishedPosts(db);
		expect(first.items).toHaveLength(BLOG_PAGE_SIZE);
		expect(first.hasMore).toBe(true);
		expect((await listPublishedPosts(db, { page: 2 })).items).toHaveLength(1);
	});
});

describe('deletePost', () => {
	it('deletes, and 404s when missing', async () => {
		const p = await createPost(db, admin.id, post());
		await deletePost(db, p.id);
		expect(await getPost(db, p.id)).toBeNull();
		await expect(deletePost(db, p.id)).rejects.toThrow(NotFoundError);
	});
});

describe('previousPost', () => {
	it('finds the published post before this one', async () => {
		const first = await createPost(db, admin.id, post({ title: 'First' }));
		const draft = await createPost(db, admin.id, post({ title: 'Draft', publish: false }));
		const second = await createPost(db, admin.id, post({ title: 'Second' }));
		expect(await previousPost(db, second)).toEqual({ slug: first.slug, title: 'First' });
		expect(await previousPost(db, first)).toBeNull();
		expect(await previousPost(db, draft)).toBeNull();
		expect((await getPublishedPost(db, second.slug))?.authorUsername).toBeTruthy();
	});
});
