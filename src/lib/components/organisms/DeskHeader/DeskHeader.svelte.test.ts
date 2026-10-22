import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import DeskHeader from './DeskHeader.svelte';

describe('DeskHeader', () => {
	it('greets the member and offers to write', async () => {
		const screen = await render(DeskHeader, { name: 'theminnow' });
		await expect.element(screen.getByText('Signed in as theminnow')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Your stories' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'write a new story' }))
			.toHaveAttribute('href', '/write');
		await expectAccessible(screen.container);
	});
});
