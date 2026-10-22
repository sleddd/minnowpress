import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { buildChainTree } from '#lib/chain.ts';
import type { StorySummary } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ChainTree from './ChainTree.svelte';

const author = { id: 1, username: 'jane', displayName: 'Jane', avatarUrl: null };
const s = (
	id: number,
	parentId: number | null,
	relation: StorySummary['relation'],
	title: string
): StorySummary => ({
	id,
	parentId,
	relation,
	title,
	author
});

const nodes = buildChainTree([
	s(1, null, null, 'Root'),
	s(2, 1, 'sequel', 'Second'),
	s(3, 1, 'prequel', 'Zero'),
	s(4, 2, 'sequel', 'Third')
]);

describe('ChainTree', () => {
	it('renders the tree as nested lists of story links', async () => {
		const screen = await render(ChainTree, { nodes });
		await expect
			.element(screen.getByRole('navigation', { name: 'Story chain' }))
			.toBeInTheDocument();
		for (const title of ['Root', 'Second', 'Zero', 'Third'])
			await expect.element(screen.getByRole('link', { name: title })).toBeInTheDocument();
		const third = screen.getByRole('link', { name: 'Third' }).element();
		expect(
			third.closest('ul')?.parentElement?.closest('ul')?.parentElement?.closest('ul')
		).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('marks the current story', async () => {
		const screen = await render(ChainTree, { nodes, currentId: 2 });
		await expect.element(screen.getByText('You are here')).toBeInTheDocument();
		expect(screen.container.querySelectorAll('.current')).toHaveLength(1);
	});
});
