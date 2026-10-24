import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ReportForm from './ReportForm.svelte';

describe('ReportForm', () => {
	it('opens to a form with a reason that includes suspected AI', async () => {
		const screen = await render(ReportForm, {
			action: '/s/3?/report',
			targetType: 'story',
			targetId: 3
		});
		await screen.getByText('Report', { exact: true }).click();
		const select = screen.getByRole('combobox', { name: 'Reason' });
		await expect.element(select).toHaveValue('ai_generated');
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('action')).toBe('/s/3?/report');
		const data = new FormData(form);
		expect(data.get('targetType')).toBe('story');
		expect(data.get('targetId')).toBe('3');
		await expectAccessible(screen.container);
	});

	it('uses unique ids per target', async () => {
		const screen = await render(ReportForm, {
			action: '/s/3?/report',
			targetType: 'comment',
			targetId: 9
		});
		expect(screen.container.querySelector('#report-comment-9-reason')).not.toBeNull();
	});

	it('shows a thank-you once reported', async () => {
		const screen = await render(ReportForm, {
			action: 'x',
			targetType: 'story',
			targetId: 3,
			reported: true
		});
		// Already open, so the thanks is visible without another click.
		expect(screen.container.querySelector('details')?.open).toBe(true);
		await expect.element(screen.getByText(/A moderator will take a look/)).toBeVisible();
		expect(screen.container.querySelector('form')).toBeNull();
	});

	it('lets readers say a story should be marked mature, but not a comment', async () => {
		const story = await render(ReportForm, {
			action: '/s/3?/report',
			targetType: 'story',
			targetId: 3
		});
		await story.getByText('Report', { exact: true }).click();
		const options = () =>
			[...story.container.querySelectorAll('option')].map((o) => o.getAttribute('value'));
		expect(options()).toContain('mature');
		await story.unmount();

		const comment = await render(ReportForm, {
			action: '/s/3?/report',
			targetType: 'comment',
			targetId: 8
		});
		await comment.getByText('Report', { exact: true }).click();
		expect([...comment.container.querySelectorAll('option')].map((o) => o.value)).not.toContain(
			'mature'
		);
	});
});
