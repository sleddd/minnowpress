import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { computeActivityScore, recomputeActivityScores } from './activity';
import type { DB } from './db/client';
import { stories } from './db/schema';
import { rateStory } from './ratings';
import { addComment } from './social';
import { continueStory, createStory, removeStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

const base = { ratings: 0, comments: 0, continuations: 0, ageHours: 0 };

describe('computeActivityScore', () => {
	it('gives a brand-new story with no activity a small positive score', () => {
		expect(computeActivityScore(base)).toBeCloseTo(1 / Math.pow(2, 1.5));
	});

	it('weights continuations over comments over ratings', () => {
		const like = computeActivityScore({ ...base, ratings: 1 });
		const comment = computeActivityScore({ ...base, comments: 1 });
		const continuation = computeActivityScore({ ...base, continuations: 1 });
		expect(continuation).toBeGreaterThan(comment);
		expect(comment).toBeGreaterThan(like);
	});

	it('decays with age', () => {
		expect(computeActivityScore({ ...base, ageHours: 48 })).toBeLessThan(
			computeActivityScore({ ...base, ageHours: 1 })
		);
	});

	it('treats negative ages (clock skew) as zero', () => {
		expect(computeActivityScore({ ...base, ageHours: -5 })).toBe(computeActivityScore(base));
	});
});

describe('recomputeActivityScores', () => {
	let db: DB;
	beforeEach(async () => {
		db = await createTestDb();
	});

	const score = async (id: number) =>
		(await db.select().from(stories).where(eq(stories.id, id)))[0].activityScore;

	it('scores recent stories and ranks the busier one higher', async () => {
		const a = await makeUser(db);
		const b = await makeUser(db);
		const input = { title: 'T', body: 'B' + PAD, tags: [], publish: true };
		const quiet = await createStory(db, a.id, input);
		const busy = await createStory(db, a.id, input);
		await rateStory(db, b.id, busy.id, 5);
		await addComment(db, b.id, busy.id, 'nice');
		await continueStory(db, b.id, busy.id, 'sequel', input);

		const n = await recomputeActivityScores(db);
		expect(n).toBe(3);
		expect(await score(busy.id)).toBeGreaterThan(await score(quiet.id));
		expect(await score(quiet.id)).toBeGreaterThan(0);
	});

	it('zeroes old and removed stories', async () => {
		const a = await makeUser(db);
		const input = { title: 'T', body: 'B' + PAD, tags: [], publish: true };
		const old = await createStory(db, a.id, input);
		const gone = await createStory(db, a.id, input);
		await db
			.update(stories)
			.set({ activityScore: 5, publishedAt: new Date(0) })
			.where(eq(stories.id, old.id));
		await db.update(stories).set({ activityScore: 5 }).where(eq(stories.id, gone.id));
		await removeStory(db, gone.id, a.id);

		expect(await recomputeActivityScores(db)).toBe(0);
		expect(await score(old.id)).toBe(0);
		expect(await score(gone.id)).toBe(0);
	});
});
