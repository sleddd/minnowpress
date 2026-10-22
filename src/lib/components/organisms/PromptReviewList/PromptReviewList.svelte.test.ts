import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import PromptReviewList from './PromptReviewList.svelte';

const prompts = [
	{
		id: 1,
		title: 'Fog',
		promptText: 'A light that is not theirs.',
		source: 'ai' as const,
		createdAt: new Date()
	},
	{
		id: 2,
		title: 'Rain',
		promptText: 'Someone waits.',
		source: 'human' as const,
		createdAt: new Date()
	}
];
const suggestedStart = new Date('2026-10-22T00:00:00Z');

describe('PromptReviewList', () => {
	it('shows editable prompts with a suggested schedule', async () => {
		const screen = await render(PromptReviewList, { prompts, suggestedStart });
		await expect.element(screen.getByText('AI-suggested')).toBeInTheDocument();
		await expect.element(screen.getByText('Human')).toBeInTheDocument();
		const form = screen.container.querySelector('form')!;
		const data = new FormData(form);
		expect(data.get('id')).toBe('1');
		expect(data.get('title')).toBe('Fog');
		expect(data.get('startsAt')).toBe('2026-10-22');
		expect(data.get('endsAt')).toBeNull();
		await expect.element(screen.getByText(/Runs 14 days/).first()).toBeInTheDocument();
		expect(form.getAttribute('action')).toBe('?/approve');
		await expect
			.element(screen.getByRole('button', { name: 'Reject' }).first())
			.toHaveAttribute('formaction', '?/reject');
		await expectAccessible(screen.container);
	});

	it('shows an error on the matching prompt', async () => {
		const screen = await render(PromptReviewList, {
			prompts,
			suggestedStart,
			error: { id: 2, message: 'Pick a start date.' }
		});
		const alerts = screen.container.querySelectorAll('[role="alert"]');
		expect(alerts).toHaveLength(1);
		expect(
			alerts[0].closest('li')?.querySelector<HTMLInputElement>('input[name="id"]')?.value
		).toBe('2');
	});

	it('shows an empty state', async () => {
		const screen = await render(PromptReviewList, { prompts: [], suggestedStart });
		await expect
			.element(screen.getByRole('heading', { name: 'No prompts waiting' }))
			.toBeInTheDocument();
	});
});
