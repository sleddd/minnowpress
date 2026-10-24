import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { latestOwnStories, recentActivity, storyCounts } from './desk';
import { rateStory } from './ratings';
import { addComment, deleteComment } from './social';
import { continueStory, createStory, removeStory } from './stories';
import { createTestDb, makeUser, PAD } from './testing/db';

let db: DB;
let me: Awaited<ReturnType<typeof makeUser>>;
let them: Awaited<ReturnType<typeof makeUser>>;
const input = (o = {}) => ({
	title: 'Falling Home',
	body: 'B' + PAD,
	tags: [],
	publish: true,
	...o
});

beforeEach(async () => {
	db = await createTestDb();
	me = await makeUser(db, { displayName: 'Jason' });
	them = await makeUser(db, { displayName: 'ElshaHawk' });
});

describe('recentActivity', () => {
	it("lists others' comments and continuations on my stories, newest first", async () => {
		const mine = await createStory(db, me.id, input());
		await addComment(db, them.id, mine.id, 'Lovely');
		await addComment(db, me.id, mine.id, 'Thanks');
		await new Promise((r) => setTimeout(r, 5));
		const sequel = await continueStory(db, them.id, mine.id, 'sequel', input({ title: 'Landing' }));
		await continueStory(db, me.id, mine.id, 'prequel', input());
		await continueStory(db, them.id, mine.id, 'sequel', input({ publish: false }));

		const { items: events } = await recentActivity(db, me.id);
		expect(events.map((e) => e.kind)).toEqual(['sequel', 'comment']);
		expect(events[0]).toMatchObject({
			actor: { displayName: 'ElshaHawk' },
			story: { id: mine.id, title: 'Falling Home' },
			continuation: { id: sequel.id, title: 'Landing' }
		});
		expect(events[1]).toMatchObject({ kind: 'comment', continuation: null, score: null });
	});

	it('is empty for someone with no activity and respects the limit', async () => {
		expect(await recentActivity(db, them.id)).toEqual({ items: [], next: null });
		const mine = await createStory(db, me.id, input());
		for (let i = 0; i < 3; i++) await addComment(db, them.id, mine.id, `c${i}`);
		expect((await recentActivity(db, me.id, { limit: 2 })).items).toHaveLength(2);
	});
});

describe('recentActivity with ratings', () => {
	it('shows my own ratings, and who rated my stories', async () => {
		const mine = await createStory(db, me.id, input());
		const theirs = await createStory(db, them.id, input({ title: 'Their Story' }));
		await rateStory(db, them.id, mine.id, 4);
		await new Promise((r) => setTimeout(r, 5));
		await rateStory(db, me.id, theirs.id, 5);

		const { items } = await recentActivity(db, me.id);
		expect(items).toEqual([
			expect.objectContaining({
				kind: 'rated',
				actor: null,
				score: 5,
				story: { id: theirs.id, title: 'Their Story' }
			}),
			expect.objectContaining({
				kind: 'rating',
				actor: { username: them.username, displayName: 'ElshaHawk' },
				score: 4,
				story: expect.anything()
			})
		]);
		expect(items[1].story.id).toBe(mine.id);
		// Their activity shows their own rating, and mine of their story, the same way.
		expect((await recentActivity(db, them.id)).items.map((e) => e.kind)).toEqual([
			'rating',
			'rated'
		]);
	});

	it('pages back through older activity', async () => {
		const mine = await createStory(db, me.id, input());
		for (let i = 0; i < 5; i++) {
			await addComment(db, them.id, mine.id, `c${i}`);
			await new Promise((r) => setTimeout(r, 3));
		}
		const first = await recentActivity(db, me.id, { limit: 2 });
		expect(first.items).toHaveLength(2);
		expect(first.next).toEqual(first.items[1].at);
		const second = await recentActivity(db, me.id, { limit: 2, before: first.next });
		const third = await recentActivity(db, me.id, { limit: 2, before: second.next });
		expect(third.items).toHaveLength(1);
		expect(third.next).toBeNull();
		const times = [...first.items, ...second.items, ...third.items].map((e) => e.at.getTime());
		expect(new Set(times).size).toBe(5);
		expect(times).toEqual([...times].sort((a, b) => b - a));
	});
});

describe('recentActivity and mature stories', () => {
	it('leaves out other people’s mature stories unless the member opted in', async () => {
		const mine = await createStory(db, me.id, input());
		await continueStory(db, them.id, mine.id, 'sequel', input({ title: 'Racy', isMature: true }));
		const theirs = await createStory(db, them.id, input({ title: 'Theirs', isMature: true }));
		await rateStory(db, me.id, theirs.id, 4);

		expect((await recentActivity(db, me.id)).items).toEqual([]);
		const shown = await recentActivity(db, me.id, { showMature: true });
		expect(shown.items.map((e) => e.kind).sort()).toEqual(['rated', 'sequel']);
	});
});

describe('recentActivity after moderation', () => {
	it('leaves out deleted comments and stories that were taken down', async () => {
		const mine = await createStory(db, me.id, input());
		const gone = await addComment(db, them.id, mine.id, 'spam');
		await deleteComment(db, them.id, gone.id);
		expect((await recentActivity(db, me.id)).items).toEqual([]);

		const other = await createStory(db, me.id, input());
		await addComment(db, them.id, other.id, 'Lovely');
		await continueStory(db, them.id, other.id, 'sequel', input());
		await removeStory(db, other.id, me.id);
		expect((await recentActivity(db, me.id)).items).toEqual([]);
	});
});

describe('storyCounts', () => {
	it('counts drafts and published stories', async () => {
		await createStory(db, me.id, input());
		await createStory(db, me.id, input({ publish: false }));
		await createStory(db, me.id, input({ publish: false }));
		expect(await storyCounts(db, me.id)).toEqual({ drafts: 2, published: 1 });
		expect(await storyCounts(db, them.id)).toEqual({ drafts: 0, published: 0 });
	});
});

describe('latestOwnStories', () => {
	it('lists drafts and published stories together, newest first, only the member’s', async () => {
		const first = await createStory(db, me.id, input({ title: 'First' }));
		const draft = await createStory(db, me.id, input({ title: 'Half done', publish: false }));
		await createStory(db, them.id, input({ title: 'Not mine' }));
		const items = await latestOwnStories(db, me.id);
		expect(items.map((s) => [s.id, s.draft])).toEqual([
			[draft.id, true],
			[first.id, false]
		]);
		expect(items[0].title).toBe('Half done');
		expect(items[0].at).toBeInstanceOf(Date);
	});

	it('stops at the limit and leaves removed stories out', async () => {
		const kept = [];
		for (let i = 0; i < 3; i++) kept.push(await createStory(db, me.id, input()));
		await removeStory(db, kept[2].id, them.id);
		expect((await latestOwnStories(db, me.id, 1)).map((s) => s.id)).toEqual([kept[1].id]);
		expect(await latestOwnStories(db, them.id)).toEqual([]);
	});
});
