import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Viewer } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import SiteHeader from './SiteHeader.svelte';

const viewer: Viewer = {
	id: 1,
	username: 'jason',
	displayName: 'Jason Garber',
	avatarUrl: null,
	role: 'user',
	showMature: false
};

describe('SiteHeader', () => {
	it('shows the logo, tagline, and visitor links', async () => {
		const screen = await render(SiteHeader, { appName: 'MinnowPress', viewer: null, path: '/' });
		await expect
			.element(screen.getByRole('link', { name: /^minnowpress/ }))
			.toHaveAttribute('href', '/');
		await expect.element(screen.getByText('Little stories, endless sequels.')).toBeInTheDocument();
		const nav = screen.getByRole('navigation', { name: 'Account' });
		await expect
			.element(nav.getByRole('link', { name: 'Sign in' }))
			.toHaveAttribute('href', '/login');
		await expect.element(nav.getByRole('link', { name: 'Join us' })).toBeInTheDocument();
		await expect
			.element(nav.getByRole('link', { name: 'What is MinnowPress?' }))
			.toHaveAttribute('href', '/about');
		// The sun sits beside the menu, outside it, so it stays on phones too.
		await expect
			.element(screen.getByRole('button', { name: 'Turn the lights off (dark theme)' }))
			.toBeInTheDocument();
		await expect.element(nav.getByRole('link', { name: 'Blog' })).toBeInTheDocument();
		await expect.element(nav.getByRole('link', { name: 'Help' })).toHaveAttribute('href', '/help');
		await expectAccessible(screen.container);
	});

	it('shows who is signed in, their desk, and sign out', async () => {
		const screen = await render(SiteHeader, { appName: 'M', viewer, path: '/desk' });
		await expect.element(screen.getByText('Signed in as:')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Jason Garber' }))
			.toHaveAttribute('href', '/@jason');
		await expect
			.element(screen.getByRole('link', { name: 'Your desk' }))
			.toHaveAttribute('aria-current', 'page');
		await expect.element(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows the admin link to moderators', async () => {
		const screen = await render(SiteHeader, {
			appName: 'M',
			viewer: { ...viewer, role: 'admin' },
			path: '/admin/blog'
		});
		await expect
			.element(screen.getByRole('link', { name: 'Admin' }))
			.toHaveAttribute('aria-current', 'page');
	});
});
