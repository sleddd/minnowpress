import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryAside from './StoryAside.svelte';

describe('StoryAside', () => {
	it('shows tags, publish date, rating count, challenge, and license', async () => {
		const screen = await render(StoryAside, {
			tags: ['humor', 'duck'],
			publishedAt: new Date('2009-05-16T20:41:33Z'),
			ratingsCount: 20,
			challenge: { id: 4, title: 'Fog' }
		});
		await expect.element(screen.getByRole('heading', { name: 'Tags' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'humor' })).toBeInTheDocument();
		await expect.element(screen.getByText('May 16, 2009')).toBeInTheDocument();
		await expect.element(screen.getByText('Published', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('20 times')).toBeInTheDocument();
		await expect.element(screen.getByText('Edited', { exact: true })).not.toBeInTheDocument();
		await screen.rerender({
			tags: [],
			publishedAt: new Date('2009-05-16T20:41:33Z'),
			editedAt: new Date('2026-10-21T12:00:00Z'),
			ratingsCount: 0
		});
		await expect.element(screen.getByText('Edited', { exact: true })).toBeInTheDocument();
		await screen.rerender({
			tags: ['humor', 'duck'],
			publishedAt: new Date('2009-05-16T20:41:33Z'),
			ratingsCount: 20,
			challenge: { id: 4, title: 'Fog' }
		});
		await expect.element(screen.getByRole('heading', { name: 'Appeared in' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Fog' }))
			.toHaveAttribute('href', '/challenges/4');
		await expect.element(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('handles drafts, no tags, no ratings, and archive stories', async () => {
		const screen = await render(StoryAside, {
			tags: [],
			publishedAt: null,
			ratingsCount: 0,
			archive: { url: 'https://ficly.com/stories/1/', author: 'THX', authorUrl: null }
		});
		await expect.element(screen.getByText('No tags yet.')).toBeInTheDocument();
		await expect.element(screen.getByText('Published', { exact: true })).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'CC BY-SA 3.0' })).toBeInTheDocument();
		await screen.rerender({ tags: [], publishedAt: new Date(), ratingsCount: 0, archive: null });
		await expect.element(screen.getByText('Not yet')).toBeInTheDocument();
	});
});
