import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ReportView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ReportQueue from './ReportQueue.svelte';

const report = (o: Partial<ReportView> = {}): ReportView => ({
	id: 1,
	targetType: 'story',
	targetId: 5,
	reason: 'ai_generated',
	note: 'Reads like a chatbot.',
	createdAt: new Date(),
	reporter: 'bob',
	target: { title: 'Suspicious', body: 'As an AI language model…', storyId: 5 },
	...o
});

describe('ReportQueue', () => {
	it('lists reports with a preview and resolve buttons', async () => {
		const screen = await render(ReportQueue, { reports: [report()] });
		await expect.element(screen.getByText('Suspected AI')).toBeInTheDocument();
		await expect.element(screen.getByText('story reported by @bob')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Suspicious' }))
			.toHaveAttribute('href', '/s/5');
		await expect.element(screen.getByText('Note: Reads like a chatbot.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Remove story' }))
			.toHaveAttribute('value', 'remove');
		await expect
			.element(screen.getByRole('button', { name: 'Dismiss' }))
			.toHaveAttribute('value', 'dismiss');
		expect(new FormData(screen.container.querySelector('form')!).get('reportId')).toBe('1');
		await expectAccessible(screen.container);
	});

	it('handles missing targets, comments, and no note', async () => {
		const screen = await render(ReportQueue, {
			reports: [report({ targetType: 'comment', reason: 'spam', note: '', target: null })]
		});
		await expect
			.element(screen.getByText('The reported item no longer exists.'))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Remove comment' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/Note:/)).not.toBeInTheDocument();
	});

	it('shows an empty state', async () => {
		const screen = await render(ReportQueue, { reports: [] });
		await expect.element(screen.getByRole('heading', { name: 'All clear' })).toBeInTheDocument();
	});

	it('offers to mark a story mature, but not a comment', async () => {
		const screen = await render(ReportQueue, {
			reports: [
				report({ reason: 'mature' }),
				report({
					id: 2,
					targetType: 'comment',
					reason: 'abuse',
					target: { title: 'Suspicious', body: 'rude', storyId: 5 }
				})
			]
		});
		await expect.element(screen.getByText('Should be mature')).toBeInTheDocument();
		const buttons = screen.getByRole('button', { name: 'Mark mature' });
		await expect.element(buttons).toHaveAttribute('value', 'mature');
		expect(buttons.elements()).toHaveLength(1);
	});
});
