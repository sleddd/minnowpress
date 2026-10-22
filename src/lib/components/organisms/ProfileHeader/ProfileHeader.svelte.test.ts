import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ProfileView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ProfileHeader from './ProfileHeader.svelte';

const profile: ProfileView = {
	username: 'jane',
	displayName: 'Jane Doe',
	bio: 'I write about the sea.',
	website: 'https://jane.dev/',
	avatarUrl: null,
	createdAt: new Date('2026-01-05T00:00:00Z')
};
const counts = { stories: 1, followers: 2, following: 3 };

describe('ProfileHeader', () => {
	it('shows the profile with counts and a follow button', async () => {
		const screen = await render(ProfileHeader, {
			profile,
			counts,
			isSelf: false,
			following: false,
			signedIn: true
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Jane Doe' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/@jane/)).toBeInTheDocument();
		await expect.element(screen.getByText('“I write about the sea.”')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'jane.dev' }))
			.toHaveAttribute('rel', 'nofollow noopener ugc');
		await expect.element(screen.getByText('1 story')).toBeInTheDocument();
		await expect.element(screen.getByText('2 followers')).toBeInTheDocument();
		await expect.element(screen.getByText('3 following')).toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows edit profile on your own page and copes with no bio or website', async () => {
		const screen = await render(ProfileHeader, {
			profile: { ...profile, bio: '', website: null },
			counts,
			isSelf: true,
			following: false,
			signedIn: true
		});
		await expect
			.element(screen.getByRole('link', { name: 'Edit profile' }))
			.toHaveAttribute('href', '/settings');
		await expect.element(screen.getByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'jane.dev' })).not.toBeInTheDocument();
	});

	it('shows moderators a suspend button, or a way to lift a suspension', async () => {
		const screen = await render(ProfileHeader, {
			profile,
			counts,
			isSelf: false,
			following: false,
			signedIn: true,
			moderation: { suspended: false }
		});
		const suspend = screen.getByRole('button', { name: 'Suspend member' });
		await expect.element(suspend).toBeInTheDocument();
		expect(screen.container.querySelector('form.moderation')?.getAttribute('action')).toBe(
			'?/suspend'
		);
		await screen.rerender({ moderation: { suspended: true } });
		await expect
			.element(screen.getByRole('button', { name: 'Lift suspension' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/can’t sign in/)).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows no moderation controls by default', async () => {
		const screen = await render(ProfileHeader, {
			profile,
			counts,
			isSelf: false,
			following: false,
			signedIn: true
		});
		await expect
			.element(screen.getByRole('button', { name: 'Suspend member' }))
			.not.toBeInTheDocument();
	});
});
