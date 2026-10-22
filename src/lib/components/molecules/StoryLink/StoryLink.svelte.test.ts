import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryLink from './StoryLink.svelte';

const story = {
	id: 5,
	title: 'After the Fog',
	relation: 'sequel' as const,
	author: { displayName: 'Jane' }
};

describe('StoryLink', () => {
	it('links to the story with its author', async () => {
		const screen = await render(StoryLink, { story });
		await expect
			.element(screen.getByRole('link', { name: 'After the Fog' }))
			.toHaveAttribute('href', '/s/5');
		await expect.element(screen.getByText('by Jane')).toBeInTheDocument();
		await expect.element(screen.getByText('sequel')).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('can show the relation', async () => {
		const screen = await render(StoryLink, { story, showRelation: true });
		await expect.element(screen.getByText('sequel')).toBeInTheDocument();
	});

	it('credits the original author of archive stories', async () => {
		const screen = await render(StoryLink, { story: { ...story, archiveAuthor: 'Kevin' } });
		await expect.element(screen.getByText('by Kevin')).toBeInTheDocument();
	});
});
