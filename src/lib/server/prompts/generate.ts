/**
 * The ONLY place in the app that talks to an AI model.
 *
 * It generates short writing *prompts*. Admins review them on /admin/prompts; the daily job
 * (ensureCurrentChallenge) also starts one unreviewed when no approved challenge is waiting.
 * It never writes, edits, completes, or comments on stories. ESLint forbids importing
 * @anthropic-ai/* anywhere else.
 *
 * Calls Claude on Amazon Bedrock through the standard InvokeModel API (IAM: bedrock:InvokeModel).
 */
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import { and, isNotNull, notLike, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { challenges, type Challenge } from '../db/schema';
import { CHALLENGE_PROMPT_MAX, CHALLENGE_TITLE_MAX, createChallenge } from '../challenges';

export const DEFAULT_PROMPT_MODEL = 'anthropic.claude-opus-5-5';

/**
 * The kinds of challenge Ficly members used to set, rotated daily so consecutive challenges
 * don't all feel alike. Each one is a shape, not a subject: the writers bring the subject.
 */
export const SEEDS = [
	'a single word, and nothing more',
	'a playful writing constraint (a banned letter, an exact length, a required word)',
	'a big open question to answer however you like',
	'a theme or feeling',
	'a "first time / last time" or other pairing of opposites',
	'an object that has to appear somewhere in the story',
	'a "what if" about the everyday world',
	'a place, any place',
	'a well-worn genre to turn upside down',
	'a point-of-view twist (tell it from somewhere unexpected)',
	'a familiar saying or proverb to take literally or not at all',
	'a season, a holiday, or a time of day'
];

export function pickSeed(date: Date): string {
	const day = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
	return SEEDS[((day % SEEDS.length) + SEEDS.length) % SEEDS.length];
}

const SYSTEM = `You set writing challenges for MinnowPress, a community of human writers carrying on the spirit of Ficly (2009–2014). Every story is 1024 characters or less, and anyone can write a prequel or sequel to anyone else's story.

Ficly challenges were short, friendly, and wide open, written by members for each other. They looked like:
- A single word: "Tomb." or "Clear."
- A playful constraint: "Write any story without the letter U." or "Write the best six-word story ever."
- A big question: "What is a soul worth?"
- A loose theme: "Write about a first time and a last time."
- A small hook: "Something is missing from your living room. What happened to it?"

Write challenges like those. Keep each one short (a word to two sentences), casual, and roomy enough that a hundred writers would write a hundred different stories: no named characters, no plot, no setting details beyond a nudge, no list of required events. Prefer suggestion over instruction. Never write story text, opening lines, or example passages; the writing belongs to the community. Keep it suitable for everyone: no graphic violence or sexual content.`;

const SCHEMA = {
	type: 'object',
	properties: {
		prompts: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					title: { type: 'string', description: 'A short, playful title (1-5 words).' },
					prompt: {
						type: 'string',
						description: 'The challenge itself: a single word up to two short, casual sentences.'
					}
				},
				required: ['title', 'prompt'],
				additionalProperties: false
			}
		}
	},
	required: ['prompts'],
	additionalProperties: false
} as const;

export interface GeneratedPrompt {
	title: string;
	prompt: string;
}

/** Validates model output. Drops entries that are empty or too long rather than trusting them. */
export function parsePrompts(raw: string): GeneratedPrompt[] {
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		throw new Error('Prompt model returned invalid JSON');
	}
	const list = (data as { prompts?: unknown })?.prompts;
	if (!Array.isArray(list)) throw new Error('Prompt model returned no prompts array');
	return list
		.filter(
			(p): p is GeneratedPrompt => typeof p?.title === 'string' && typeof p?.prompt === 'string'
		)
		.map((p) => ({ title: p.title.trim(), prompt: p.prompt.trim() }))
		.filter(
			(p) =>
				p.title.length > 0 &&
				p.prompt.length > 0 &&
				p.title.length <= CHALLENGE_TITLE_MAX &&
				p.prompt.length <= CHALLENGE_PROMPT_MAX
		);
}

export interface PromptClient {
	model: string;
	messages: Pick<AnthropicBedrock['messages'], 'create'>;
}

export interface BedrockConfig {
	accessKeyId?: string;
	secretAccessKey?: string;
	region: string;
	model: string;
}

/** A Bedrock client, or null when credentials aren't configured (suggestions are then disabled). */
export function createPromptClient(config: BedrockConfig): PromptClient | null {
	if (!config.accessKeyId || !config.secretAccessKey) return null;
	const client = new AnthropicBedrock({
		awsRegion: config.region,
		awsAccessKey: config.accessKeyId,
		awsSecretKey: config.secretAccessKey
	});
	return { model: config.model, messages: client.messages };
}

export async function generatePrompts(
	client: PromptClient,
	opts: { count?: number; seed: string; examples?: GeneratedPrompt[] }
): Promise<GeneratedPrompt[]> {
	const count = opts.count ?? 5;
	const flavor = opts.examples?.length
		? `\n\nFor flavor, a few real challenges from the old Ficly community (don't copy or reuse them):\n${opts.examples
				.map((e) => `- ${e.title}: ${e.prompt}`)
				.join('\n')}`
		: '';
	const ask =
		count === 1
			? `Write 1 challenge. Its shape: ${opts.seed}.`
			: `Write ${count} challenges, each a different shape. Lean toward: ${opts.seed}.`;
	// Bedrock has no server-side refusal fallback; a refusal surfaces as an error the admin can retry.
	const response = await client.messages.create({
		model: client.model,
		max_tokens: 4000,
		output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
		system: SYSTEM,
		messages: [
			{
				role: 'user',
				content: ask + flavor
			}
		]
	});
	if (response.stop_reason === 'refusal') throw new Error('Prompt model declined the request');
	const text = response.content.find((b) => b.type === 'text');
	if (!text || text.type !== 'text') throw new Error('Prompt model returned no text');
	return parsePrompts(text.text).slice(0, count);
}

/** Generates prompts and stores them as pending AI challenges for admin review. */
export async function generateAndSavePrompts(
	db: DB,
	client: PromptClient,
	now = new Date()
): Promise<Challenge[]> {
	const prompts = await generatePrompts(client, {
		seed: pickSeed(now),
		examples: await ficlyExamples(db)
	});
	const saved: Challenge[] = [];
	for (const p of prompts) {
		saved.push(await createChallenge(db, { title: p.title, promptText: p.prompt, source: 'ai' }));
	}
	return saved;
}

/** A plain-language reason a prompt request failed, for the admin who pressed the button. */
export function describePromptError(e: unknown): string {
	const err = e as { status?: number; message?: string };
	const message = String(err?.message ?? '');
	if (err?.status === 403 || /not authorized|AccessDenied/i.test(message))
		return 'AWS refused the request: the IAM user isn’t allowed to call Bedrock. Give it the bedrock:InvokeModel permission (see the README), then try again.';
	if (err?.status === 404 || (/model/i.test(message) && /not found|invalid/i.test(message)))
		return `Bedrock doesn’t recognise the model in BEDROCK_MODEL. Check the model id and region.`;
	if (err?.status === 429)
		return 'Bedrock is rate limiting requests right now. Try again in a minute.';
	if (/refus|declined/i.test(message)) return 'The model declined that request. Try again.';
	return 'Could not get prompt suggestions right now. Try again later.';
}

/**
 * A few short challenges from the Ficly archive, picked at random, to show the model the
 * community's voice. Long or link-heavy ones are skipped.
 */
export async function ficlyExamples(db: DB, limit = 6): Promise<GeneratedPrompt[]> {
	const rows = await db
		.select({ title: challenges.title, prompt: challenges.promptText })
		.from(challenges)
		.where(
			and(
				isNotNull(challenges.archiveId),
				sql`length(${challenges.promptText}) between 4 and 200`,
				notLike(challenges.promptText, '%http%')
			)
		)
		.orderBy(sql`random()`)
		.limit(limit);
	return rows.map((r) => ({ title: r.title, prompt: r.prompt.replace(/\s+/g, ' ').trim() }));
}
