import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import RibbonNav from './RibbonNav.svelte';

describe('RibbonNav', () => {
	it('links the main sections and searches', async () => {
		const screen = await render(RibbonNav, { path: '/', query: 'duck' });
		const nav = screen.getByRole('navigation', { name: 'Main' });
		for (const [label, href] of [
			['your stories', '/desk'],
			['write', '/write'],
			['tags', '/tags'],
			['challenges', '/challenges'],
			['browse', '/browse']
		])
			await expect.element(nav.getByRole('link', { name: label })).toHaveAttribute('href', href);
		await expect.element(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
		await expect.element(screen.getByRole('searchbox')).toHaveValue('duck');
		expect(screen.container.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
		await expectAccessible(screen.container);
	});

	it('marks the current section, including pages that belong to it', async () => {
		const screen = await render(RibbonNav, { path: '/s/12' });
		await expect
			.element(screen.getByRole('link', { name: 'browse' }))
			.toHaveAttribute('aria-current', 'page');
		await screen.rerender({ path: '/@jason' });
		await expect
			.element(screen.getByRole('link', { name: 'your stories' }))
			.toHaveAttribute('aria-current', 'page');
		await screen.rerender({ path: '/challenges/4' });
		await expect
			.element(screen.getByRole('link', { name: 'challenges' }))
			.toHaveAttribute('aria-current', 'page');
		await screen.rerender({ path: '/writers' });
		await expect
			.element(screen.getByRole('link', { name: 'write' }))
			.not.toHaveAttribute('aria-current');
	});

	describe('phone menu', () => {
		const phone = async () => {
			const { page } = await import('@vitest/browser/context');
			await page.viewport(390, 800);
		};
		afterEach(async () => {
			const { page } = await import('@vitest/browser/context');
			await page.viewport(1280, 900);
		});

		it('opens to show the sections, search, and sign-in links', async () => {
			await phone();
			const screen = await render(RibbonNav, { path: '/tags', appName: 'MinnowPress' });
			const menu = screen.container.querySelector('details.menu') as HTMLDetailsElement;
			expect(menu.open).toBe(false);
			await screen.getByLabelText('Menu').click();
			expect(menu.open).toBe(true);
			const links = [...menu.querySelectorAll('.menu-links a')].map((a) => a.getAttribute('href'));
			expect(links).toEqual(['/desk', '/write', '/tags', '/challenges', '/browse']);
			expect(menu.querySelector('.menu-links a[aria-current="page"]')?.getAttribute('href')).toBe(
				'/tags'
			);
			expect(menu.querySelector('#menu-search')).not.toBeNull();
			expect(menu.textContent).toContain('What is MinnowPress?');
			await screen.rerender({ path: '/browse', appName: 'MinnowPress' });
			expect(menu.open).toBe(false);
		});

		it('shows who is signed in, with admin for moderators and a sign-out button', async () => {
			await phone();
			const viewer = {
				id: 1,
				username: 'minnow',
				displayName: 'theminnow',
				role: 'admin' as const,
				avatarUrl: null,
				showMature: false
			};
			const screen = await render(RibbonNav, { path: '/', viewer });
			const menu = screen.container.querySelector('details.menu') as HTMLDetailsElement;
			expect(menu.textContent).toContain('Signed in as');
			expect(menu.querySelector('a.me')?.getAttribute('href')).toBe('/@minnow');
			expect(menu.querySelector('a[href="/admin"]')).not.toBeNull();
			expect(menu.querySelector('form[action="/logout"] button')?.textContent).toBe('Sign out');
			await screen.rerender({ path: '/', viewer: { ...viewer, role: 'user' as const } });
			expect(menu.querySelector('a[href="/admin"]')).toBeNull();
		});
	});
});
