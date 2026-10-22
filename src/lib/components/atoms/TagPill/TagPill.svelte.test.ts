import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TagPill from './TagPill.svelte';

describe('TagPill', () => {
	it('links to the tag page', async () => {
		const screen = await render(TagPill, { tag: 'space-opera' });
		await expect
			.element(screen.getByRole('link', { name: 'space-opera' }))
			.toHaveAttribute('href', '/tags/space-opera');
	});

	it('encodes non-ascii tags in the URL', async () => {
		const screen = await render(TagPill, { tag: 'café' });
		await expect.element(screen.getByRole('link')).toHaveAttribute('href', '/tags/caf%C3%A9');
	});

	it('can show a story count', async () => {
		const screen = await render(TagPill, { tag: 'sea', count: 12 });
		await expect.element(screen.getByRole('link', { name: 'sea 12' })).toBeInTheDocument();
	});

	it('updates its link when the tag changes', async () => {
		const screen = await render(TagPill, { tag: 'sea' });
		await screen.rerender({ tag: 'fog' });
		await expect
			.element(screen.getByRole('link', { name: 'fog' }))
			.toHaveAttribute('href', '/tags/fog');
	});
});
