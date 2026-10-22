import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryColumns from './StoryColumns.svelte';

const story = (id: number, title: string, name = 'THX 0477') => ({
	id,
	title,
	author: { username: 'thx', displayName: name }
});

describe('StoryColumns', () => {
	it('shows each column with its blurb and stories, plus tags', async () => {
		const screen = await render(StoryColumns, {
			columns: [
				{
					title: 'Popular',
					blurb: 'Everyone’s reading these.',
					stories: [story(1, 'Existential Death Hole')],
					more: { href: '/stories', label: 'More' }
				},
				{
					title: 'Recent',
					blurb: 'Still warm off the press.',
					stories: [story(2, 'The End', 'Lone Writer')]
				}
			],
			tags: [{ name: 'duck', count: 3 }]
		});
		await expect.element(screen.getByRole('region', { name: 'Popular' })).toBeInTheDocument();
		await expect.element(screen.getByText('Everyone’s reading these.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Existential Death Hole' }))
			.toHaveAttribute('href', '/s/1');
		await expect.element(screen.getByRole('link', { name: 'Lone Writer' })).toBeInTheDocument();
		await expect.element(screen.getByText(/^by\s+Lone Writer$/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'More' }))
			.toHaveAttribute('href', '/stories');
		await expect.element(screen.getByRole('region', { name: 'Tags' })).toBeInTheDocument();
		await expect.element(screen.getByText('Find your current.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'duck' }))
			.toHaveAttribute('href', '/tags/duck');
		await expectAccessible(screen.container);
	});

	it('shows empty messages and no tags column by default', async () => {
		const screen = await render(StoryColumns, {
			columns: [
				{
					title: 'Active',
					blurb: 'Chains growing right now.',
					stories: [],
					empty: 'Quiet right now.'
				}
			]
		});
		await expect.element(screen.getByText(/Oh no!\s+Quiet right now\./)).toBeInTheDocument();
		await expect.element(screen.getByRole('region', { name: 'Tags' })).not.toBeInTheDocument();
		await screen.rerender({ columns: [{ title: 'Recent', blurb: 'b', stories: [] }] });
		await expect.element(screen.getByText(/Oh no!\s+Nothing here yet\./)).toBeInTheDocument();
	});

	it('keeps the more link inside an empty lane', async () => {
		const screen = await render(StoryColumns, {
			columns: [
				{
					title: 'Active',
					blurb: 'b',
					stories: [],
					more: { href: '/stories?tab=active', label: 'More active' }
				}
			]
		});
		await expect
			.element(screen.getByRole('link', { name: 'More active' }))
			.toHaveAttribute('href', '/stories?tab=active');
	});
});
