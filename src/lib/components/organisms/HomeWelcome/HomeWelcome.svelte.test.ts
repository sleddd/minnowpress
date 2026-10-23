import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import HomeWelcome from './HomeWelcome.svelte';

describe('HomeWelcome', () => {
	it('welcomes visitors and invites them to jump in', async () => {
		const screen = await render(HomeWelcome, { appName: 'MinnowPress', signedIn: false });
		await expect.element(screen.getByText('Welcome to MinnowPress')).toBeInTheDocument();
		await expect
			.element(screen.getByText(/^Welcome to Minnow Press, a little corner of the internet/))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { name: 'Small stories swim in schools.' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/1,024 characters, about 150 words/)).toBeInTheDocument();
		await expect.element(screen.getByText(/labor of love/)).not.toBeInTheDocument();
		await expect
			.element(screen.getByText(/one little minnow becomes a school/))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Learn more' }))
			.toHaveAttribute('href', '/about');
		await expect
			.element(screen.getByRole('link', { name: 'jump in' }))
			.toHaveAttribute('href', '/login');
		await expectAccessible(screen.container);
	});

	it('sends members straight to writing', async () => {
		const screen = await render(HomeWelcome, { appName: 'M', signedIn: true });
		await expect
			.element(screen.getByRole('link', { name: 'jump in' }))
			.toHaveAttribute('href', '/write');
	});
});
