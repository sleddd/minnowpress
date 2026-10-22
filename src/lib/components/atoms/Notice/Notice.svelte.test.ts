import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Notice from './Notice.svelte';

describe('Notice', () => {
	it('is a polite status by default', async () => {
		const screen = await render(Notice, { children: text('Saved.') });
		const el = screen.getByRole('status');
		await expect.element(el).toHaveTextContent('Saved.');
		await expect.element(el).toHaveClass('info');
	});

	it('is an alert for errors', async () => {
		const screen = await render(Notice, { tone: 'error', children: text('Failed.') });
		await expect.element(screen.getByRole('alert')).toHaveClass('error');
	});

	it('supports success', async () => {
		const screen = await render(Notice, { tone: 'success', children: text('Check your email.') });
		await expect.element(screen.getByRole('status')).toHaveClass('success');
	});
});
