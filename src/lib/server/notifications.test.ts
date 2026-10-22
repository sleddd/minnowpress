import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DB } from './db/client';
import { stories, users } from './db/schema';
import type { Email } from './email';
import {
	deliverSafely,
	notifyComment,
	notifyContinuation,
	sendWeeklyDigests,
	type NotifyContext
} from './notifications';
import { addComment, follow } from './social';
import { continueStory, createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

let db: DB;
let sent: Email[];
let ctx: NotifyContext;
let alice: Awaited<ReturnType<typeof makeUser>>;
let bob: Awaited<ReturnType<typeof makeUser>>;
const input = (o = {}) => ({
	title: 'The Lighthouse',
	body: 'Fog.' + PAD,
	tags: [],
	publish: true,
	...o
});

beforeEach(async () => {
	db = await createTestDb();
	sent = [];
	ctx = {
		send: async (e) => void sent.push(e),
		origin: 'https://minnow.test',
		appName: 'MinnowPress'
	};
	alice = await makeUser(db, { displayName: 'Alice' });
	bob = await makeUser(db, { displayName: 'Bob' });
});

describe('notifyComment', () => {
	it('emails the author with a link to the story', async () => {
		const story = await createStory(db, alice.id, input());
		const comment = await addComment(db, bob.id, story.id, 'Chills <3');
		expect(await notifyComment(db, ctx, comment.id)).toBe(true);
		expect(sent).toHaveLength(1);
		expect(sent[0].to).toBe(alice.email);
		expect(sent[0].subject).toBe('Bob commented on “The Lighthouse” · MinnowPress');
		expect(sent[0].text).toContain(`https://minnow.test/s/${story.id}`);
		expect(sent[0].text).toContain('https://minnow.test/settings');
		expect(sent[0].html).toContain('Chills &lt;3');
	});

	it('skips your own comments, opted-out authors, and missing comments', async () => {
		const story = await createStory(db, alice.id, input());
		const own = await addComment(db, alice.id, story.id, 'Thanks');
		expect(await notifyComment(db, ctx, own.id)).toBe(false);
		await db.update(users).set({ notifyComments: false }).where(eq(users.id, alice.id));
		const other = await addComment(db, bob.id, story.id, 'Hi');
		expect(await notifyComment(db, ctx, other.id)).toBe(false);
		expect(await notifyComment(db, ctx, 9999)).toBe(false);
		expect(sent).toEqual([]);
	});

	it('never emails the archive account', async () => {
		await db.update(users).set({ isArchive: true }).where(eq(users.id, alice.id));
		const story = await createStory(db, alice.id, input());
		const comment = await addComment(db, bob.id, story.id, 'Hi');
		expect(await notifyComment(db, ctx, comment.id)).toBe(false);
	});
});

describe('notifyContinuation', () => {
	it('emails the parent author about a published sequel', async () => {
		const root = await createStory(db, alice.id, input());
		const sequel = await continueStory(db, bob.id, root.id, 'sequel', input({ title: 'The Ship' }));
		expect(await notifyContinuation(db, ctx, sequel.id)).toBe(true);
		expect(sent[0].subject).toBe('Bob wrote a sequel to “The Lighthouse” · MinnowPress');
		expect(sent[0].text).toContain(`/s/${sequel.id}`);
	});

	it('does not quote a mature continuation to an author who has not opted in', async () => {
		const root = await createStory(db, alice.id, input());
		const body = 'Something only for opted-in readers.' + PAD;
		const sequel = await continueStory(
			db,
			bob.id,
			root.id,
			'sequel',
			input({ body, isMature: true })
		);
		await notifyContinuation(db, ctx, sequel.id);
		expect(sent[0].text).not.toContain('Something only');
		expect(sent[0].text).toContain('marked mature');

		await db.update(users).set({ showMature: true }).where(eq(users.id, alice.id));
		await notifyContinuation(db, ctx, sequel.id);
		expect(sent[1].text).toContain('Something only');
	});

	it('skips roots, drafts, self-continuations, and opted-out authors', async () => {
		const root = await createStory(db, alice.id, input());
		expect(await notifyContinuation(db, ctx, root.id)).toBe(false);
		const draft = await continueStory(db, bob.id, root.id, 'sequel', input({ publish: false }));
		expect(await notifyContinuation(db, ctx, draft.id)).toBe(false);
		const own = await continueStory(db, alice.id, root.id, 'prequel', input());
		expect(await notifyContinuation(db, ctx, own.id)).toBe(false);
		await db.update(users).set({ notifyContinuations: false }).where(eq(users.id, alice.id));
		const other = await continueStory(db, bob.id, root.id, 'sequel', input());
		expect(await notifyContinuation(db, ctx, other.id)).toBe(false);
		expect(await notifyContinuation(db, ctx, 9999)).toBe(false);
		expect(sent).toEqual([]);
	});

	it('skips when the parent is gone', async () => {
		const root = await createStory(db, alice.id, input());
		const sequel = await continueStory(db, bob.id, root.id, 'sequel', input());
		await db.delete(stories).where(eq(stories.id, root.id));
		expect(await notifyContinuation(db, ctx, sequel.id)).toBe(false);
	});
});

describe('deliverSafely', () => {
	it('swallows and logs failures', async () => {
		const log = vi.fn();
		await deliverSafely(async () => {
			throw new Error('smtp down');
		}, log);
		expect(log).toHaveBeenCalledWith('Notification failed', expect.any(Error));
	});

	it('runs successful tasks', async () => {
		const task = vi.fn().mockResolvedValue(true);
		await deliverSafely(task);
		expect(task).toHaveBeenCalledOnce();
	});
});

describe('sendWeeklyDigests', () => {
	it("sends opted-in readers the week's stories from writers they follow", async () => {
		const carol = await makeUser(db, { displayName: 'Carol' });
		await db.update(users).set({ notifyDigest: true }).where(eq(users.id, bob.id));
		await follow(db, bob.id, alice.id);
		await follow(db, carol.id, alice.id); // not opted in
		const recent = await createStory(db, alice.id, input({ title: 'New One' }));
		const old = await createStory(db, alice.id, input({ title: 'Old One' }));
		await db
			.update(stories)
			.set({ publishedAt: new Date(Date.now() - 10 * 86_400_000) })
			.where(eq(stories.id, old.id));
		await createStory(db, alice.id, input({ title: 'Mature One', isMature: true }));
		await createStory(db, carol.id, input({ title: 'Unfollowed' }));

		const count = await sendWeeklyDigests(db, ctx, new Date(Date.now() + 1000));
		expect(count).toBe(1);
		expect(sent[0].to).toBe(bob.email);
		expect(sent[0].text).toContain('New One — Alice');
		expect(sent[0].text).toContain(`/s/${recent.id}`);
		expect(sent[0].text).not.toContain('Old One');
		expect(sent[0].text).not.toContain('Mature One');
		expect(sent[0].text).not.toContain('Unfollowed');
		expect(sent[0].text).toContain('A new story');
	});

	it('includes mature stories for readers who opted in, and pluralizes', async () => {
		await db
			.update(users)
			.set({ notifyDigest: true, showMature: true })
			.where(eq(users.id, bob.id));
		await follow(db, bob.id, alice.id);
		await createStory(db, alice.id, input({ title: 'One' }));
		await createStory(db, alice.id, input({ title: 'Two', isMature: true }));
		await sendWeeklyDigests(db, ctx, new Date(Date.now() + 1000));
		expect(sent[0].text).toContain('2 new stories');
	});

	it('sends nothing when there is nothing new', async () => {
		await db.update(users).set({ notifyDigest: true }).where(eq(users.id, bob.id));
		expect(await sendWeeklyDigests(db, ctx)).toBe(0);
	});
});
