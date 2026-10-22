import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Link from './Link.svelte';

describe('Link', () => {
	it('renders an anchor with href', async () => {
		const screen = await render(Link, { href: '/about', children: text('About') });
		const link = screen.getByRole('link', { name: 'About' });
		await expect.element(link).toHaveAttribute('href', '/about');
		await expect.element(link).toHaveClass('default');
		await expect.element(link).not.toHaveAttribute('aria-current');
	});

	it('marks the current page', async () => {
		const screen = await render(Link, {
			href: '/',
			variant: 'nav',
			current: true,
			children: text('Latest')
		});
		const link = screen.getByRole('link');
		await expect.element(link).toHaveAttribute('aria-current', 'page');
		await expect.element(link).toHaveClass('nav');
	});

	it('passes through attributes', async () => {
		const screen = await render(Link, {
			href: 'https://ficly.com',
			rel: 'noopener',
			children: text('Ficly')
		});
		await expect.element(screen.getByRole('link')).toHaveAttribute('rel', 'noopener');
	});

	it('renders button-style variants at full width', async () => {
		const screen = await render(Link, {
			href: '/write',
			variant: 'outline',
			block: true,
			children: text('Write a prequel')
		});
		const link = screen.getByRole('link');
		await expect.element(link).toHaveClass('outline');
		await expect.element(link).toHaveClass('block');
	});

	it('marks the current item in the nav bar', async () => {
		const screen = await render(Link, {
			href: '/',
			variant: 'navbar',
			current: true,
			children: text('Stories')
		});
		await expect.element(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
	});
});
