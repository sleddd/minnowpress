import { describe, expect, it, vi } from 'vitest';
import { challenges } from '../db/schema';
import { pendingPrompts } from '../challenges';
import { createTestDb } from '../testing/db';
import {
	createPromptClient,
	DEFAULT_PROMPT_MODEL,
	describePromptError,
	generateAndSavePrompts,
	ficlyExamples,
	generatePrompts,
	parsePrompts,
	pickSeed,
	SEEDS,
	type PromptClient
} from './generate';

const fakeClient = (response: object) => {
	const create = vi.fn().mockResolvedValue(response);
	return {
		client: { model: 'test-model', messages: { create } } as unknown as PromptClient,
		create
	};
};

const textResponse = (prompts: unknown) => ({
	stop_reason: 'end_turn',
	content: [{ type: 'text', text: JSON.stringify({ prompts }) }]
});

describe('pickSeed', () => {
	it('rotates daily through the seed list', () => {
		const day = 24 * 60 * 60 * 1000;
		const a = pickSeed(new Date(0));
		const b = pickSeed(new Date(day));
		expect(SEEDS).toContain(a);
		expect(b).not.toBe(a);
		expect(pickSeed(new Date(SEEDS.length * day))).toBe(a);
		expect(SEEDS).toContain(pickSeed(new Date(-day)));
	});
});

describe('parsePrompts', () => {
	it('parses and trims valid prompts', () => {
		expect(
			parsePrompts(JSON.stringify({ prompts: [{ title: ' Fog ', prompt: ' A lighthouse. ' }] }))
		).toEqual([{ title: 'Fog', prompt: 'A lighthouse.' }]);
	});

	it('drops malformed, empty, and over-long entries', () => {
		const raw = JSON.stringify({
			prompts: [
				{ title: 'ok', prompt: 'fine' },
				{ title: 1, prompt: 'x' },
				null,
				{ title: '', prompt: 'x' },
				{ title: 'x'.repeat(101), prompt: 'x' },
				{ title: 'x', prompt: 'x'.repeat(501) }
			]
		});
		expect(parsePrompts(raw)).toEqual([{ title: 'ok', prompt: 'fine' }]);
	});

	it('throws on invalid JSON or a missing array', () => {
		expect(() => parsePrompts('not json')).toThrow('invalid JSON');
		expect(() => parsePrompts('{}')).toThrow('no prompts array');
	});
});

describe('generatePrompts', () => {
	it('asks the prompt model for structured prompts and caps the count', async () => {
		const { client, create } = fakeClient(
			textResponse(Array.from({ length: 7 }, (_, i) => ({ title: `T${i}`, prompt: 'p' })))
		);
		const prompts = await generatePrompts(client, { seed: 'a sound in the night', count: 3 });
		expect(prompts).toHaveLength(3);
		const params = create.mock.calls[0][0];
		expect(params.model).toBe('test-model');
		expect(params.output_config.format.type).toBe('json_schema');
		expect(params.output_config.effort).toBe('low');
		expect(params.messages[0].content).toContain('a sound in the night');
		expect(params.system).toMatch(/Never write story text/);
		expect(params.system).toMatch(/Ficly/);
	});

	it('asks for one challenge of the day’s shape, with Ficly examples for flavor', async () => {
		const { client, create } = fakeClient(textResponse([{ title: 'Tomb', prompt: 'Tomb.' }]));
		await generatePrompts(client, {
			seed: 'a single word, and nothing more',
			count: 1,
			examples: [{ title: 'Clear', prompt: 'Write something with the word clear.' }]
		});
		const content = create.mock.calls[0][0].messages[0].content;
		expect(content).toContain('Write 1 challenge. Its shape: a single word, and nothing more.');
		expect(content).toContain('- Clear: Write something with the word clear.');
		expect(content).toMatch(/don't copy/);
	});

	it('throws on refusal or missing text', async () => {
		await expect(
			generatePrompts(fakeClient({ stop_reason: 'refusal', content: [] }).client, { seed: 's' })
		).rejects.toThrow('declined');
		await expect(
			generatePrompts(fakeClient({ stop_reason: 'end_turn', content: [] }).client, { seed: 's' })
		).rejects.toThrow('no text');
	});
});

describe('generateAndSavePrompts', () => {
	it('stores prompts as pending AI challenges', async () => {
		const db = await createTestDb();
		const { client } = fakeClient(textResponse([{ title: 'Fog', prompt: 'A lighthouse in fog.' }]));
		const saved = await generateAndSavePrompts(db, client);
		expect(saved).toHaveLength(1);
		const pending = await pendingPrompts(db);
		expect(pending).toMatchObject([{ title: 'Fog', source: 'ai', status: 'pending' }]);
	});
});

describe('createPromptClient', () => {
	const config = { region: 'us-east-1', model: DEFAULT_PROMPT_MODEL };

	it('is disabled without both AWS credentials', () => {
		expect(createPromptClient(config)).toBeNull();
		expect(createPromptClient({ ...config, accessKeyId: 'AKIA' })).toBeNull();
		expect(createPromptClient({ ...config, secretAccessKey: 'secret' })).toBeNull();
	});

	it('builds a Bedrock client for the configured model', () => {
		const client = createPromptClient({
			...config,
			accessKeyId: 'AKIA',
			secretAccessKey: 'secret'
		});
		expect(client?.model).toBe('anthropic.claude-opus-5-5');
		expect(typeof client?.messages.create).toBe('function');
	});
});

describe('describePromptError', () => {
	it('explains permission, model, rate-limit, and refusal errors in plain words', () => {
		expect(
			describePromptError({
				status: 403,
				message: 'not authorized to perform: bedrock-mantle:CreateInference'
			})
		).toMatch(/bedrock:InvokeModel/);
		expect(describePromptError({ status: 404, message: 'Not Found' })).toMatch(/model/);
		expect(describePromptError({ status: 429, message: 'slow down' })).toMatch(/rate limiting/);
		expect(describePromptError(new Error('Prompt model declined the request'))).toMatch(/declined/);
		expect(describePromptError(new Error('socket hang up'))).toMatch(/Try again later/);
		expect(describePromptError(null)).toMatch(/Try again later/);
	});
});

describe('ficlyExamples', () => {
	it('picks short archive challenges without links', async () => {
		const db = await createTestDb();
		await db.insert(challenges).values([
			{
				title: 'Tomb',
				promptText: 'Not a home for memories,\n but for regrets.',
				source: 'human',
				archiveId: 1
			},
			{ title: 'Photo', promptText: 'See http://example.com/pic', source: 'human', archiveId: 2 },
			{ title: 'Long', promptText: 'x'.repeat(300), source: 'human', archiveId: 3 },
			{ title: 'Ours', promptText: 'A new one of ours.', source: 'human' }
		]);
		expect(await ficlyExamples(db)).toEqual([
			{ title: 'Tomb', prompt: 'Not a home for memories, but for regrets.' }
		]);
	});
});
