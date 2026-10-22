import { beforeEach, describe, expect, it } from 'vitest';
import type { DB } from './db/client';
import { recentActivity, storyCounts } from './desk';
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

		const events = await recentActivity(db, me.id);
		expect(events.map((e) => e.kind)).toEqual(['sequel', 'comment']);
		expect(events[0]).toMatchObject({
			actor: { displayName: 'ElshaHawk' },
			story: { id: mine.id, title: 'Falling Home' },
			continuation: { id: sequel.id, title: 'Landing' }
		});
		expect(events[1]).toMatchObject({ kind: 'comment', continuation: null });
	});

	it('is empty for someone with no activity and respects the limit', async () => {
		expect(await recentActivity(db, them.id)).toEqual([]);
		const mine = await createStory(db, me.id, input());
		for (let i = 0; i < 3; i++) await addComment(db, them.id, mine.id, `c${i}`);
		expect(await recentActivity(db, me.id, 2)).toHaveLength(2);
	});
});

describe('recentActivity after moderation', () => {
	it('leaves out deleted comments and stories that were taken down', async () => {
		const mine = await createStory(db, me.id, input());
		const gone = await addComment(db, them.id, mine.id, 'spam');
		await deleteComment(db, them.id, gone.id);
		expect(await recentActivity(db, me.id)).toEqual([]);

		const other = await createStory(db, me.id, input());
		await addComment(db, them.id, other.id, 'Lovely');
		await continueStory(db, them.id, other.id, 'sequel', input());
		await removeStory(db, other.id, me.id);
		expect(await recentActivity(db, me.id)).toEqual([]);
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
