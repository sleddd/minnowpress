import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StoryDetailView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import StoryView from './StoryView.svelte';

const author = {
	id: 1,
	username: 'thx',
	displayName: 'THX 0477',
	avatarUrl: null,
	bio: 'Writes about ducks, mostly.'
};

const story = (o: Partial<StoryDetailView> = {}): StoryDetailView => ({
	id: 10,
	title: 'Test',
	body: '"This is only a test."\n\n"Shut up and get into your duck suit."',
	status: 'published',
	isMature: false,
	relation: null,
	chainId: 10,
	ratingsCount: 20,
	averageRating: 4.2,
	commentsCount: 6,
	publishedAt: new Date('2009-05-16T20:41:33Z'),
	createdAt: new Date('2009-05-16T20:41:33Z'),
	author,
	archive: null,
	tags: ['humor'],
	parent: null,
	sequels: [],
	prequels: [],
	challenge: null,
	...o
});

const reader = { signedIn: true, isAuthor: false, isModerator: false };

describe('StoryView', () => {
	it('renders the title, author block, body, ratings, and actions', async () => {
		const screen = await render(StoryView, { story: story(), ...reader, rating: 3 });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Test' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Author:')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'THX 0477' }))
			.toHaveAttribute('href', '/@thx');
		await expect.element(screen.getByText('Writes about ducks, mostly.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Read bio' }))
			.toHaveAttribute('href', '/@thx');
		await expect.element(screen.getByText(/duck suit/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('img', { name: 'Rated 4.2 out of 5' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Rate 3 out of 5' }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect.element(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: '6 comments' }))
			.toHaveAttribute('href', '#comments');
		await expect.element(screen.getByText('Report', { exact: true })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('flags mature stories and skips an empty bio', async () => {
		const screen = await render(StoryView, {
			story: story({ isMature: true, author: { ...author, bio: '  ' } }),
			...reader
		});
		await expect.element(screen.getByText('Mature')).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Read bio' })).not.toBeInTheDocument();
	});

	it('lets the author manage a draft and hides reader actions', async () => {
		const screen = await render(StoryView, {
			story: story({ status: 'draft', publishedAt: null }),
			...reader,
			isAuthor: true
		});
		await expect
			.element(screen.getByText('This is a draft. Only you can see it.'))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Edit draft' }))
			.toHaveAttribute('href', '/write?edit=10');
		await expect.element(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Delete draft' })).toBeInTheDocument();
		await expect.element(screen.getByText('Your rating')).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('stops authors rating their own story and hides report', async () => {
		const screen = await render(StoryView, {
			story: story(),
			...reader,
			isAuthor: true,
			bookmarked: true
		});
		await expect.element(screen.getByText("You can't rate your own story.")).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Edit story' }))
			.toHaveAttribute('href', '/write?edit=10');
		await screen.getByText('Delete this story').click();
		await expect.element(screen.getByRole('button', { name: 'Delete for good' })).toBeVisible();
		expect(screen.container.querySelector('.delete form')?.getAttribute('action')).toBe(
			'/s/10?/delete'
		);
		await expect.element(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
		await expect.element(screen.getByText('Report', { exact: true })).not.toBeInTheDocument();
	});

	it('gives moderators a remove button and signed-out readers a sign-in link', async () => {
		const mod = await render(StoryView, { story: story(), ...reader, isModerator: true });
		await expect
			.element(mod.getByRole('button', { name: 'Remove (moderator)' }))
			.toBeInTheDocument();
		await mod.unmount();
		const anon = await render(StoryView, {
			story: story({ averageRating: null }),
			...reader,
			signedIn: false
		});
		await expect
			.element(anon.getByRole('link', { name: 'Sign in to rate this story' }))
			.toBeInTheDocument();
		await expect.element(anon.getByRole('img', { name: 'Not rated yet' })).toBeInTheDocument();
		await expect.element(anon.getByText('Report', { exact: true })).not.toBeInTheDocument();
	});

	it('credits archive stories to their original author (the aside carries the license)', async () => {
		const archive = {
			url: 'https://ficly.com/stories/1/',
			author: 'THX 0477',
			authorUrl: 'https://ficly.com/authors/thx-0477/'
		};
		const screen = await render(StoryView, {
			story: story({ archive, author: { ...author, displayName: 'Ficly Archive' } }),
			...reader
		});
		await expect
			.element(screen.getByRole('link', { name: 'THX 0477' }).first())
			.toHaveAttribute('href', '/authors/ficly/thx-0477');
		await expect.element(screen.getByText('Ficly Archive')).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Edit story' })).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Read bio' })).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('withholds a mature story from readers who have not opted in', async () => {
		const hidden = story({ isMature: true, body: '' });
		const screen = await render(StoryView, { story: hidden, ...reader, matureHidden: true });
		await expect.element(screen.getByText('This story is marked mature.')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Turn on mature stories in Settings' }))
			.toHaveAttribute('href', '/settings');
		await expectAccessible(screen.container);

		const out = await render(StoryView, {
			story: hidden,
			...reader,
			signedIn: false,
			matureHidden: true
		});
		await expect
			.element(out.getByRole('link', { name: 'Sign in', exact: true }))
			.toHaveAttribute('href', '/login?next=/s/10');
	});
});
