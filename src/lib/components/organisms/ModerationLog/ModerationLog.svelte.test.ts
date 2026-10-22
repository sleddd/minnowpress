import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ModerationLogView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ModerationLog from './ModerationLog.svelte';

const entry = (o: Partial<ModerationLogView> = {}): ModerationLogView => ({
	id: 1,
	action: 'remove_story',
	targetType: 'story',
	targetId: 5,
	reportId: 3,
	createdAt: new Date(),
	actor: 'mod',
	target: { label: 'Suspicious', href: '/s/5' },
	...o
});

const url = { href: 'http://localhost/admin/log' };

describe('ModerationLog', () => {
	it('lists who did what, linking to the target', async () => {
		const screen = await render(ModerationLog, {
			entries: [
				entry(),
				entry({
					id: 2,
					action: 'suspend_user',
					targetType: 'user',
					targetId: 9,
					reportId: null,
					actor: null,
					target: { label: 'Member #9', href: null }
				})
			],
			page: 1,
			hasMore: false,
			url
		});
		await expect.element(screen.getByText('Removed story')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Suspicious' }))
			.toHaveAttribute('href', '/s/5');
		await expect.element(screen.getByText(/by @mod · report #3/)).toBeInTheDocument();
		await expect.element(screen.getByText('Suspended member')).toBeInTheDocument();
		await expect.element(screen.getByText('Member #9')).toBeInTheDocument();
		await expect.element(screen.getByText(/by a former moderator/)).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('pages through a long log', async () => {
		const screen = await render(ModerationLog, {
			entries: [entry({ action: 'dismiss_report' })],
			page: 2,
			hasMore: true,
			url
		});
		await expect.element(screen.getByText('Dismissed report')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: /Newer/ })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: /Older/ })).toBeInTheDocument();
	});

	it('shows an empty state', async () => {
		const screen = await render(ModerationLog, { entries: [], page: 1, hasMore: false, url });
		await expect.element(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument();
	});
});
