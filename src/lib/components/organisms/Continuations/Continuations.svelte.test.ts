import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import Continuations from './Continuations.svelte';

const bob = { id: 2, username: 'henjo', displayName: 'Henjo', avatarUrl: null };
const summary = (id: number, title: string) => ({
	id,
	title,
	relation: 'sequel' as const,
	parentId: 10,
	author: bob
});

describe('Continuations', () => {
	it('lists prequels and sequels with links to write more', async () => {
		const screen = await render(Continuations, {
			storyId: 10,
			prequels: [summary(9, 'Duck Hunting')],
			sequels: [summary(11, 'Negotiation')],
			chainHref: '/chain/9?from=10'
		});
		await expect.element(screen.getByRole('region', { name: 'Prequels' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Duck Hunting' }))
			.toHaveAttribute('href', '/s/9');
		await expect
			.element(screen.getByRole('link', { name: 'Negotiation' }))
			.toHaveAttribute('href', '/s/11');
		await expect
			.element(screen.getByRole('link', { name: 'Write a prequel' }))
			.toHaveAttribute('href', '/write?prequel_to=10');
		await expect
			.element(screen.getByRole('link', { name: 'Write a sequel' }))
			.toHaveAttribute('href', '/write?sequel_to=10');
		await expect
			.element(screen.getByRole('link', { name: 'See the whole chain' }))
			.toHaveAttribute('href', '/chain/9?from=10');
		await expect.element(screen.getByText('Oh no!')).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows the "Oh no!" empty states', async () => {
		const screen = await render(Continuations, { storyId: 10, prequels: [], sequels: [] });
		await expect.element(screen.getByText(/doesn’t have a prequel/)).toBeInTheDocument();
		await expect.element(screen.getByText(/doesn’t have a sequel/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'See the whole chain' }))
			.not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows only the next sequel, and points to the chain for the rest', async () => {
		const screen = await render(Continuations, {
			storyId: 10,
			prequels: [],
			sequels: [summary(11, 'Negotiation'), summary(12, 'Second'), summary(13, 'Third')],
			chainHref: '/chain/10?from=10'
		});
		await expect.element(screen.getByRole('link', { name: 'Negotiation' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Second' })).not.toBeInTheDocument();
		await expect.element(screen.getByText(/\+ 2 more sequels/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'see the whole chain', exact: true }))
			.toHaveAttribute('href', '/chain/10?from=10');
	});
});
