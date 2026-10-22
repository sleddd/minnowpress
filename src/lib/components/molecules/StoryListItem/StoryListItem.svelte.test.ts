import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryListItem from './StoryListItem.svelte';

const story = {
	id: 7,
	title: 'Low Tide',
	body: 'The harbor drained overnight and left the boats sitting in the mud like dropped shoes.',
	relation: null,
	ratingsCount: 4,
	averageRating: 4.5,
	publishedAt: new Date(),
	author: { username: 'henjo', displayName: 'Henjo' }
};

describe('StoryListItem', () => {
	it('shows the italic title, author, excerpt, time, and rating', async () => {
		const screen = await render(StoryListItem, { story });
		await expect.element(screen.getByRole('heading', { name: 'Low Tide' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Low Tide' }))
			.toHaveAttribute('href', '/s/7');
		await expect.element(screen.getByText('Author:')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Henjo' }))
			.toHaveAttribute('href', '/@henjo');
		await expect.element(screen.getByText(/harbor drained/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('img', { name: 'Rated 4.5 out of 5' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('(4)', { exact: false })).toBeInTheDocument();
		expect(screen.container.querySelector('time')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('shows the relation and mature badge, and hides an empty rating', async () => {
		const screen = await render(StoryListItem, {
			story: { ...story, relation: 'sequel', isMature: true, ratingsCount: 0 }
		});
		await expect.element(screen.getByText('sequel', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('Mature')).toBeInTheDocument();
		await expect.element(screen.getByRole('img')).not.toBeInTheDocument();
	});

	it('credits archive stories and links to the archive author page', async () => {
		const archive = {
			url: 'https://ficly.com/stories/1/',
			author: 'THX 0477',
			authorUrl: 'https://ficly.com/authors/thx0477/'
		};
		const screen = await render(StoryListItem, {
			story: { ...story, archive, publishedAt: new Date('2009-05-16T00:00:00Z') }
		});
		await expect
			.element(screen.getByRole('link', { name: 'THX 0477' }))
			.toHaveAttribute('href', '/authors/ficly/thx0477');
		await expect.element(screen.getByText('· Ficly archive')).toBeInTheDocument();
		await expect.element(screen.getByText('May 16, 2009')).toBeInTheDocument();
	});

	it('shows archive authors without a Ficly page as plain text', async () => {
		const screen = await render(StoryListItem, {
			story: { ...story, archive: { url: 'u', author: 'Ghost', authorUrl: null } }
		});
		await expect.element(screen.getByText('Ghost')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Ghost' })).not.toBeInTheDocument();
	});

	it('has a compact, right-alignable form with title and author only', async () => {
		const screen = await render(StoryListItem, {
			story: { ...story, archiveAuthor: 'Scaramush' },
			variant: 'compact',
			align: 'end'
		});
		await expect.element(screen.getByText('Scaramush')).toBeInTheDocument();
		await expect.element(screen.getByText(/harbor drained/)).not.toBeInTheDocument();
		expect(screen.container.querySelector('.item.end')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('can show a "by" byline instead of the Author: label', async () => {
		const screen = await render(StoryListItem, {
			story: { id: 3, title: 'Deep', author: { username: 'phil', displayName: 'Phil Plait' } },
			variant: 'compact',
			byline: 'by'
		});
		await expect.element(screen.getByText(/^by\s+Phil Plait$/)).toBeInTheDocument();
		await expect.element(screen.getByText('Author:')).not.toBeInTheDocument();
	});

	it('typesets excerpts: _underscores_ become italics and quotes curl', async () => {
		const screen = await render(StoryListItem, {
			story: {
				id: 4,
				title: 'Fast',
				body: 'It happened _fast_, "and then" it didn\'t.',
				author: { username: 'a', displayName: 'A' }
			}
		});
		await expect.element(screen.getByText('fast', { exact: true })).toBeInTheDocument();
		expect(screen.container.querySelector('.excerpt em')?.textContent).toBe('fast');
		expect(screen.container.querySelector('.excerpt')?.textContent).toContain(
			'\u201Cand then\u201D it didn\u2019t.'
		);
	});
});
