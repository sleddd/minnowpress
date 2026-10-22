import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { challenges, stories } from './db/schema';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';
import {
	archiveOf,
	continueStory,
	countPublishedStories,
	createStory,
	deleteStory,
	getChain,
	getStory,
	getUserStories,
	publishStory,
	removeStory,
	restoreStory,
	tagsFor,
	editableStory,
	updateStory,
	type StoryInput
} from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

const input = (overrides: Partial<StoryInput> = {}): StoryInput => ({
	title: 'The Lighthouse',
	body: 'The keeper had not seen a ship in forty years.' + PAD,
	tags: [],
	publish: true,
	...overrides
});

let db: DB;
let alice: { id: number };
let bob: { id: number };

beforeEach(async () => {
	db = await createTestDb();
	alice = await makeUser(db);
	bob = await makeUser(db);
});

describe('createStory', () => {
	it('publishes a root story that is its own chain', async () => {
		const story = await createStory(db, alice.id, input());
		expect(story.status).toBe('published');
		expect(story.publishedAt).toBeInstanceOf(Date);
		expect(story.chainId).toBe(story.id);
		const [row] = await db.select().from(stories).where(eq(stories.id, story.id));
		expect(row.chainId).toBe(story.id);
	});

	it('saves a draft without a publish date', async () => {
		const story = await createStory(db, alice.id, input({ publish: false }));
		expect(story.status).toBe('draft');
		expect(story.publishedAt).toBeNull();
	});

	it('trims the title and normalizes the body', async () => {
		const story = await createStory(
			db,
			alice.id,
			input({ title: '  Hi ', body: ` a\r\nb${PAD} ` })
		);
		expect(story.title).toBe('Hi');
		expect(story.body).toBe(`a\nb${PAD}`);
	});

	it('rejects a body over 1024 characters', async () => {
		await expect(createStory(db, alice.id, input({ body: 'x'.repeat(1025) }))).rejects.toThrow(
			ValidationError
		);
	});

	it('stores tags, reusing existing tag rows', async () => {
		const a = await createStory(db, alice.id, input({ tags: ['ghost', 'sea'] }));
		const b = await createStory(db, bob.id, input({ tags: ['sea'] }));
		const map = await tagsFor(db, [a.id, b.id]);
		expect(map.get(a.id)).toEqual(['ghost', 'sea']);
		expect(map.get(b.id)).toEqual(['sea']);
	});

	it('accepts current and past challenges, but not one that hasn’t opened', async () => {
		const [open] = await db
			.insert(challenges)
			.values({
				title: 'Open',
				promptText: 'p',
				source: 'human',
				status: 'approved',
				startsAt: new Date(Date.now() - 1000)
			})
			.returning();
		const [closed] = await db
			.insert(challenges)
			.values({
				title: 'Closed',
				promptText: 'p',
				source: 'human',
				status: 'approved',
				startsAt: new Date(Date.now() - 2000),
				endsAt: new Date(Date.now() - 1000)
			})
			.returning();
		const [later] = await db
			.insert(challenges)
			.values({
				title: 'Later',
				promptText: 'p',
				source: 'human',
				status: 'approved',
				startsAt: new Date(Date.now() + 86_400_000)
			})
			.returning();
		const story = await createStory(db, alice.id, input({ challengeId: open.id }));
		expect(story.challengeId).toBe(open.id);
		const late = await createStory(db, alice.id, input({ challengeId: closed.id }));
		expect(late.challengeId).toBe(closed.id);
		await expect(createStory(db, alice.id, input({ challengeId: later.id }))).rejects.toThrow(
			ValidationError
		);
	});
});

describe('continueStory', () => {
	it('links a sequel to its parent and inherits the chain', async () => {
		const root = await createStory(db, alice.id, input());
		const sequel = await continueStory(db, bob.id, root.id, 'sequel', input());
		const grandchild = await continueStory(db, alice.id, sequel.id, 'prequel', input());
		expect(sequel.parentId).toBe(root.id);
		expect(sequel.relation).toBe('sequel');
		expect(sequel.chainId).toBe(root.id);
		expect(grandchild.chainId).toBe(root.id);
		expect(grandchild.relation).toBe('prequel');
	});

	it('refuses to continue a draft, removed, or missing story', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		await expect(continueStory(db, bob.id, draft.id, 'sequel', input())).rejects.toThrow(
			NotFoundError
		);
		await expect(continueStory(db, bob.id, 9999, 'sequel', input())).rejects.toThrow(NotFoundError);
		const root = await createStory(db, alice.id, input());
		await removeStory(db, root.id);
		await expect(continueStory(db, bob.id, root.id, 'sequel', input())).rejects.toThrow(
			NotFoundError
		);
	});
});

describe('drafts', () => {
	it('lets the author edit and then publish a draft', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		const edited = await updateStory(
			db,
			alice.id,
			draft.id,
			input({ title: 'New', publish: false, tags: ['x'] })
		);
		expect(edited.title).toBe('New');
		expect((await tagsFor(db, [draft.id])).get(draft.id)).toEqual(['x']);
		const published = await publishStory(db, alice.id, draft.id);
		expect(published.status).toBe('published');
		expect(published.publishedAt).toBeInstanceOf(Date);
	});

	it('can publish while updating', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		const published = await updateStory(db, alice.id, draft.id, input({ publish: true }));
		expect(published.status).toBe('published');
		expect(published.editedAt).toBeNull();
	});

	it('lets authors edit published stories, which stay published and are marked edited', async () => {
		const pub = await createStory(db, alice.id, input({ tags: ['sea'] }));
		const later = new Date(Date.now() + 60_000);
		const edited = await updateStory(
			db,
			alice.id,
			pub.id,
			input({ title: 'The Lamp', publish: false, tags: ['fog'] }),
			later
		);
		expect(edited.title).toBe('The Lamp');
		expect(edited.status).toBe('published');
		expect(edited.publishedAt?.getTime()).toBe(pub.publishedAt?.getTime());
		expect(edited.editedAt?.getTime()).toBe(later.getTime());
		expect((await tagsFor(db, [pub.id])).get(pub.id)).toEqual(['fog']);
	});

	it('forbids other users, removed stories, and Ficly archive stories', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		await expect(updateStory(db, bob.id, draft.id, input())).rejects.toThrow(ForbiddenError);
		await expect(updateStory(db, alice.id, 9999, input())).rejects.toThrow(NotFoundError);
		const removed = await createStory(db, alice.id, input());
		await removeStory(db, removed.id);
		await expect(editableStory(db, alice.id, removed.id)).rejects.toThrow(NotFoundError);
		const archived = await createStory(db, alice.id, input());
		await db.update(stories).set({ archiveId: 42 }).where(eq(stories.id, archived.id));
		await expect(updateStory(db, alice.id, archived.id, input())).rejects.toThrow(/Ficly archive/);
		const pub = await createStory(db, alice.id, input());
		await expect(publishStory(db, alice.id, pub.id)).rejects.toThrow(ForbiddenError);
		await expect(publishStory(db, alice.id, 9999)).rejects.toThrow(NotFoundError);
	});

	it('validates edits', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		await expect(updateStory(db, alice.id, draft.id, input({ title: '' }))).rejects.toThrow(
			ValidationError
		);
	});

	it('deletes a draft', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		await deleteStory(db, alice.id, draft.id);
		expect(await db.select().from(stories)).toHaveLength(0);
	});

	it('deletes a published story but keeps the continuations others wrote', async () => {
		const pub = await createStory(db, alice.id, input({ tags: ['sea'] }));
		const sequel = await continueStory(db, bob.id, pub.id, 'sequel', input({ title: 'After' }));
		await expect(deleteStory(db, bob.id, pub.id)).rejects.toThrow(ForbiddenError);
		await deleteStory(db, alice.id, pub.id);
		expect(await getStory(db, pub.id)).toBeNull();
		const orphan = await getStory(db, sequel.id);
		expect(orphan?.status).toBe('published');
		expect(orphan?.parent).toBeNull();
	});

	it('will not delete Ficly archive stories', async () => {
		const archived = await createStory(db, alice.id, input());
		await db.update(stories).set({ archiveId: 7 }).where(eq(stories.id, archived.id));
		await expect(deleteStory(db, alice.id, archived.id)).rejects.toThrow(ForbiddenError);
	});
});

describe('getStory', () => {
	it('returns author, tags, parent, and continuations split by relation', async () => {
		const root = await createStory(db, alice.id, input({ tags: ['sea'] }));
		const sequel = await continueStory(db, bob.id, root.id, 'sequel', input({ title: 'After' }));
		const prequel = await continueStory(db, bob.id, root.id, 'prequel', input({ title: 'Before' }));
		await continueStory(db, bob.id, root.id, 'sequel', input({ publish: false }));

		const detail = await getStory(db, root.id);
		expect(detail?.author.id).toBe(alice.id);
		expect(detail?.tags).toEqual(['sea']);
		expect(detail?.parent).toBeNull();
		expect(detail?.sequels.map((s) => s.id)).toEqual([sequel.id]);
		expect(detail?.prequels.map((s) => s.id)).toEqual([prequel.id]);

		const child = await getStory(db, sequel.id);
		expect(child?.parent?.id).toBe(root.id);
		expect(child?.prequels.map((s) => s.id)).toEqual([root.id]);
		const before = await getStory(db, prequel.id);
		expect(before?.sequels.map((s) => s.id)).toEqual([root.id]);
		expect(detail?.averageRating).toBeNull();
	});

	it('shows drafts only to their author and hides removed stories', async () => {
		const draft = await createStory(db, alice.id, input({ publish: false }));
		expect(await getStory(db, draft.id)).toBeNull();
		expect(await getStory(db, draft.id, bob.id)).toBeNull();
		expect(await getStory(db, draft.id, alice.id)).not.toBeNull();

		const pub = await createStory(db, alice.id, input());
		await removeStory(db, pub.id);
		expect(await getStory(db, pub.id, alice.id)).toBeNull();
		await restoreStory(db, pub.id);
		expect(await getStory(db, pub.id)).not.toBeNull();
		expect(await getStory(db, 9999)).toBeNull();
	});

	it('includes the challenge it answers', async () => {
		const [c] = await db
			.insert(challenges)
			.values({
				title: 'Fog',
				promptText: 'p',
				source: 'ai',
				status: 'approved',
				startsAt: new Date(0)
			})
			.returning();
		const story = await createStory(db, alice.id, input({ challengeId: c.id }));
		expect((await getStory(db, story.id))?.challenge).toEqual({ id: c.id, title: 'Fog' });
	});
});

describe('getChain', () => {
	it('lists published stories in the chain, oldest first', async () => {
		const root = await createStory(db, alice.id, input());
		const a = await continueStory(db, bob.id, root.id, 'sequel', input());
		const b = await continueStory(db, alice.id, a.id, 'sequel', input());
		await continueStory(db, alice.id, a.id, 'sequel', input({ publish: false }));
		await createStory(db, alice.id, input());

		const chain = await getChain(db, root.id);
		expect(chain.map((s) => s.id)).toEqual([root.id, a.id, b.id]);
		expect(chain[1]).toMatchObject({ parentId: root.id, relation: 'sequel' });
	});
});

describe('getUserStories', () => {
	it('lists published stories, plus drafts when asked', async () => {
		await createStory(db, alice.id, input());
		await createStory(db, alice.id, input({ publish: false }));
		await createStory(db, bob.id, input());
		expect(await getUserStories(db, alice.id)).toHaveLength(1);
		expect(await getUserStories(db, alice.id, { includeDrafts: true })).toHaveLength(2);
	});
});

describe('countPublishedStories', () => {
	it('counts only published stories by the author', async () => {
		await createStory(db, alice.id, input());
		await createStory(db, alice.id, input({ publish: false }));
		const removed = await createStory(db, alice.id, input());
		await removeStory(db, removed.id);
		await createStory(db, bob.id, input());
		expect(await countPublishedStories(db, alice.id)).toBe(1);
	});
});

describe('archiveOf', () => {
	const none = { archiveId: null, archiveUrl: null, archiveAuthor: null, archiveAuthorUrl: null };

	it('is null for stories written here', () => {
		expect(archiveOf(none)).toBeNull();
		expect(archiveOf({ ...none, archiveId: 3 })).toBeNull();
	});

	it('credits the original author and links to the original', () => {
		expect(
			archiveOf({
				archiveId: 3,
				archiveUrl: 'https://ficly.com/stories/3/',
				archiveAuthor: 'Kevin',
				archiveAuthorUrl: 'https://ficly.com/authors/kevin/'
			})
		).toEqual({
			url: 'https://ficly.com/stories/3/',
			author: 'Kevin',
			authorUrl: 'https://ficly.com/authors/kevin/'
		});
		expect(archiveOf({ ...none, archiveId: 3, archiveUrl: 'u' })).toEqual({
			url: 'u',
			author: 'Unknown',
			authorUrl: null
		});
	});

	it('is included on story details', async () => {
		const story = await createStory(db, alice.id, input());
		expect((await getStory(db, story.id))?.archive).toBeNull();
	});
});
