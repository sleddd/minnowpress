import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ArchiveAuthor from './ArchiveAuthor.svelte';

const author = {
	name: 'THX 0477',
	url: 'https://ficly.com/authors/thx0477/',
	stories: 552,
	firstYear: 2009,
	lastYear: 2014
};

describe('ArchiveAuthor', () => {
	it('heads the page with the ribbon, name, and credit', async () => {
		const screen = await render(ArchiveAuthor, { author, part: 'header' });
		await expect.element(screen.getByText('from the Ficly archive')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'THX 0477' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByText(/552 stories written on Ficly, 2009–2014/))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Their page on ficly.com' }))
			.toHaveAttribute('href', author.url);
		await expectAccessible(screen.container);
	});

	it('sums the author up in the sidebar', async () => {
		const screen = await render(ArchiveAuthor, {
			author: { ...author, stories: 3, firstYear: 2010, lastYear: 2010 },
			part: 'card'
		});
		await expect
			.element(screen.getByRole('region', { name: 'About THX 0477' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('stories, 2010')).toBeInTheDocument();
		await expect.element(screen.getByText(/can’t write new stories/)).toBeInTheDocument();
		await screen.rerender({ author: { ...author, firstYear: null, lastYear: null }, part: 'card' });
		await expect.element(screen.getByText('stories, 2009–2014')).toBeInTheDocument();
	});
});
