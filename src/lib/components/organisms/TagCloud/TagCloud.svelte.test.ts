import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import TagCloud from './TagCloud.svelte';

const tags = [
	{ name: 'humor', count: 12 },
	{ name: 'sci-fi', count: 5 }
];

describe('TagCloud', () => {
	it('lists tags under a heading', async () => {
		const screen = await render(TagCloud, {
			title: 'Popular tags',
			tags,
			more: { href: '/tags', label: 'All tags' }
		});
		await expect.element(screen.getByRole('region', { name: 'Popular tags' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'humor' }))
			.toHaveAttribute('href', '/tags/humor');
		await expect
			.element(screen.getByRole('link', { name: 'All tags' }))
			.toHaveAttribute('href', '/tags');
		await expectAccessible(screen.container);
	});

	it('can show counts as the page heading', async () => {
		const screen = await render(TagCloud, { title: 'Tags', tags, counts: true, headingLevel: 1 });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Tags' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'humor 12' })).toBeInTheDocument();
	});

	it('says when there are none', async () => {
		const screen = await render(TagCloud, { title: 'Tags', tags: [] });
		await expect.element(screen.getByText('No tags yet.')).toBeInTheDocument();
	});
});
