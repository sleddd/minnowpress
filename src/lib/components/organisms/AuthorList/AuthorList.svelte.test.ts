import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import AuthorList from './AuthorList.svelte';

const authors = [
	{ name: 'Henjo', href: '/@henjo', stories: 87, avatarUrl: null, archive: false },
	{
		name: 'THX 0477',
		href: '/authors/ficly/thx-0477',
		stories: 212,
		avatarUrl: null,
		archive: true
	}
];

describe('AuthorList', () => {
	it('lists authors under a heading', async () => {
		const screen = await render(AuthorList, {
			title: 'Authors to follow',
			authors,
			more: { href: '/authors', label: 'All authors' }
		});
		await expect
			.element(screen.getByRole('region', { name: 'Authors to follow' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Henjo' }))
			.toHaveAttribute('href', '/@henjo');
		await expect.element(screen.getByText('212 stories · Ficly archive')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'All authors' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows a grid layout and an empty message', async () => {
		const grid = await render(AuthorList, {
			title: 'Writers',
			authors,
			layout: 'grid',
			headingLevel: 3
		});
		expect(grid.container.querySelector('ul.grid')).not.toBeNull();
		await expect.element(grid.getByText('212 stories', { exact: true })).toBeInTheDocument();
		await grid.unmount();
		const empty = await render(AuthorList, {
			title: 'Writers',
			authors: [],
			empty: 'Be the first.'
		});
		await expect.element(empty.getByText('Be the first.')).toBeInTheDocument();
	});

	it('notes the section beside its heading and grows the list in place', async () => {
		const screen = await render(AuthorList, {
			title: 'From the Ficly archive',
			note: '2009–2014, by most stories',
			authors,
			layout: 'grid',
			more: { href: '?show=32', label: 'Show more archive authors', keepScroll: true }
		});
		await expect.element(screen.getByText('2009–2014, by most stories')).toBeInTheDocument();
		const more = screen.getByRole('link', { name: 'Show more archive authors' });
		await expect.element(more).toHaveAttribute('href', '?show=32');
		await expect.element(more).toHaveAttribute('data-sveltekit-reset', 'false');
		await expectAccessible(screen.container);
	});
});
