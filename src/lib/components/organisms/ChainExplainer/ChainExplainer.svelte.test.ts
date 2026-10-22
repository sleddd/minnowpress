import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ChainExplainer from './ChainExplainer.svelte';

describe('ChainExplainer', () => {
	it('shows what an empty prequel and sequel look like, with links to find a story', async () => {
		const screen = await render(ChainExplainer, {});
		await expect
			.element(screen.getByRole('complementary', { name: 'How prequels and sequels work' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/doesn’t have a prequel/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Write a sequel' }))
			.toHaveAttribute('href', '/browse');
		await expectAccessible(screen.container);
	});
});
