import { describe, expect, it, vi } from 'vitest';
import { todaysPrompt } from './challenges';
import { isAuthorizedCron, runActivityCron, runDigestCron, runPromptCron } from './cron';
import type { PromptClient } from './prompts/generate';
import { createStory } from './stories';
import { PAD, createTestDb, makeUser } from './testing/db';

const req = (auth?: string) =>
	new Request('http://x/api/cron/prompts', { headers: auth ? { authorization: auth } : {} });

describe('isAuthorizedCron', () => {
	it('requires the exact bearer secret', () => {
		expect(isAuthorizedCron(req('Bearer s3cret'), 's3cret')).toBe(true);
		expect(isAuthorizedCron(req('Bearer wrong'), 's3cret')).toBe(false);
		expect(isAuthorizedCron(req(), 's3cret')).toBe(false);
	});

	it('denies everything when no secret is configured', () => {
		expect(isAuthorizedCron(req('Bearer '), undefined)).toBe(false);
		expect(isAuthorizedCron(req('Bearer undefined'), undefined)).toBe(false);
	});
});

describe('runPromptCron', () => {
	const NOW = new Date('2026-10-21T00:05:00Z');
	const fakeClient = () => {
		const create = vi.fn().mockResolvedValue({
			stop_reason: 'end_turn',
			content: [
				{ type: 'text', text: JSON.stringify({ prompts: [{ title: 'Fog', prompt: 'A light.' }] }) }
			]
		});
		return { client: { model: 'm', messages: { create } } as unknown as PromptClient, create };
	};

	it('returns 503 when nothing is waiting and there is no client', async () => {
		const res = await runPromptCron(await createTestDb(), null, NOW);
		expect(res.status).toBe(503);
	});

	it('generates and starts a challenge when none is running', async () => {
		const db = await createTestDb();
		const { client, create } = fakeClient();
		const res = await runPromptCron(db, client, NOW);
		const body = await res.json();
		expect(body).toMatchObject({ ok: true, action: 'generated' });
		expect(create).toHaveBeenCalledOnce();
		expect((await todaysPrompt(db, NOW))?.title).toBe('Fog');

		// The next day the same challenge is still running; nothing new is generated.
		const again = await runPromptCron(db, client, new Date(NOW.getTime() + 86_400_000));
		expect(await again.json()).toMatchObject({ action: 'open', challengeId: body.challengeId });
		expect(create).toHaveBeenCalledOnce();
	});
});

describe('runActivityCron', () => {
	it('recomputes scores', async () => {
		const db = await createTestDb();
		const u = await makeUser(db);
		await createStory(db, u.id, { title: 'T', body: 'B' + PAD, tags: [], publish: true });
		const res = await runActivityCron(db);
		expect(await res.json()).toEqual({ ok: true, scored: 1 });
	});
});

describe('runDigestCron', () => {
	it('reports how many digests were sent', async () => {
		const db = await createTestDb();
		const ctx = { send: async () => {}, origin: 'https://m.test', appName: 'M' };
		const res = await runDigestCron(db, ctx);
		expect(await res.json()).toEqual({ ok: true, sent: 0 });
	});
});
