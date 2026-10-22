import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ChallengeView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ChallengeHeader from './ChallengeHeader.svelte';

const DAY = 86_400_000;
const challenge: ChallengeView = {
	id: 4,
	title: 'The last lighthouse keeper',
	promptText: 'Write the night the light goes out.',
	source: 'ai',
	startsAt: new Date(Date.now() - DAY),
	endsAt: new Date(Date.now() + 4.5 * DAY),
	isOpen: true,
	entries: 34
};

describe('ChallengeHeader', () => {
	it('makes the prompt the hero on the challenge page', async () => {
		const screen = await render(ChallengeHeader, { challenge, signedIn: true });
		await expect.element(screen.getByText('challenge', { exact: true })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { level: 1, name: challenge.title }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/light goes out/)).toBeInTheDocument();
		await expect.element(screen.getByText('AI-suggested prompt')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'participate!' }))
			.not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('puts the countdown, facts, and call to write in the side column', async () => {
		const screen = await render(ChallengeHeader, { challenge, variant: 'facts', signedIn: true });
		await expect
			.element(screen.getByRole('region', { name: 'About this challenge' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('4', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('days left')).toBeInTheDocument();
		await expect.element(screen.getByText('Deadline')).toBeInTheDocument();
		await expect.element(screen.getByText('Started')).toBeInTheDocument();
		await expect.element(screen.getByText('MinnowPress')).toBeInTheDocument();
		await expect.element(screen.getByText('34')).toBeInTheDocument();
		await expect.element(screen.getByText(/Think you have what it takes/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'participate!' }))
			.toHaveAttribute('href', '/write?challenge=4');
		await expectAccessible(screen.container);
	});

	it('credits the member who proposed it', async () => {
		const screen = await render(ChallengeHeader, {
			challenge: {
				...challenge,
				source: 'human',
				creator: { username: 'thx', displayName: 'THX 0477' }
			},
			variant: 'facts',
			signedIn: true
		});
		await expect
			.element(screen.getByRole('link', { name: 'THX 0477' }))
			.toHaveAttribute('href', '/@thx');
	});

	it("renders as the home page's Current challenge panel", async () => {
		const screen = await render(ChallengeHeader, {
			challenge: { ...challenge, source: 'human' },
			variant: 'banner',
			signedIn: false
		});
		await expect.element(screen.getByText(/^Current challenge\s·\sEnds /)).toBeInTheDocument();
		await expect.element(screen.getByText('4', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('days left', { exact: true })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { level: 2, name: challenge.title }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: challenge.title }))
			.toHaveAttribute('href', '/challenges/4');
		await expect.element(screen.getByText('Your prompt:')).toBeInTheDocument();
		await expect.element(screen.getByText(/light goes out/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Enter the challenge' }))
			.toHaveAttribute('href', '/login?next=%2Fwrite%3Fchallenge%3D4');
		await expect
			.element(screen.getByRole('link', { name: 'read the entries' }))
			.toHaveAttribute('href', '/challenges/4');
		await expectAccessible(screen.container);
	});

	it('counts down to the last day', async () => {
		const screen = await render(ChallengeHeader, {
			challenge: { ...challenge, endsAt: new Date(Date.now() + 1.5 * DAY) },
			variant: 'banner',
			signedIn: true
		});
		await expect.element(screen.getByText('day left', { exact: true })).toBeInTheDocument();
		await screen.rerender({
			challenge: { ...challenge, endsAt: new Date(Date.now() + DAY / 2) },
			variant: 'banner',
			signedIn: true
		});
		await expect.element(screen.getByText('last day', { exact: true })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Enter the challenge' }))
			.toHaveAttribute('href', '/write?challenge=4');
	});

	it('shows closed challenges without a countdown, still taking stories', async () => {
		const screen = await render(ChallengeHeader, {
			challenge: {
				...challenge,
				isOpen: false,
				endsAt: new Date('2009-06-20T00:00:00Z'),
				entries: undefined
			},
			variant: 'facts',
			signedIn: true
		});
		await expect.element(screen.getByText('Closed', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('Jun 20, 2009')).toBeInTheDocument();
		await expect.element(screen.getByText('Entries')).not.toBeInTheDocument();
		await expect.element(screen.getByText(/still taking stories/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'participate!' }))
			.toHaveAttribute('href', '/write?challenge=4');
	});

	it('links archive challenges to the original and credits a Ficly member', async () => {
		const archived = {
			...challenge,
			source: 'human' as const,
			isOpen: false,
			endsAt: null,
			archiveUrl: 'https://ficly.com/challenges/1/'
		};
		const hero = await render(ChallengeHeader, { challenge: archived, signedIn: true });
		await expect
			.element(hero.getByRole('link', { name: 'From the Ficly archive' }))
			.toHaveAttribute('href', 'https://ficly.com/challenges/1/');
		await hero.unmount();
		const side = await render(ChallengeHeader, {
			challenge: archived,
			variant: 'facts',
			signedIn: true
		});
		await expect.element(side.getByText('a Ficly member')).toBeInTheDocument();
	});

	it('drops the ribbon and enter link when there is no deadline or it has closed', async () => {
		const screen = await render(ChallengeHeader, {
			challenge: { ...challenge, endsAt: null },
			variant: 'banner',
			signedIn: true
		});
		await expect.element(screen.getByText(/days? left/)).not.toBeInTheDocument();
		await expect.element(screen.getByText(/^Current challenge$/)).toBeInTheDocument();
		await screen.rerender({
			challenge: { ...challenge, isOpen: false, endsAt: new Date('2009-06-20T00:00:00Z') },
			variant: 'banner',
			signedIn: true
		});
		await expect
			.element(screen.getByRole('link', { name: 'Enter the challenge' }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Read the entries' }))
			.toHaveAttribute('href', '/challenges/4');
	});

	it('previews a challenge that hasn’t opened yet', async () => {
		const later = {
			...challenge,
			isOpen: false,
			upcoming: true,
			startsAt: new Date('2026-11-05T00:00:00Z'),
			endsAt: new Date('2026-11-19T00:00:00Z')
		};
		const hero = await render(ChallengeHeader, { challenge: later, signedIn: true });
		await expect.element(hero.getByText('coming up', { exact: true })).toBeInTheDocument();
		await hero.unmount();
		const side = await render(ChallengeHeader, {
			challenge: later,
			variant: 'facts',
			signedIn: true
		});
		await expect.element(side.getByText(/^Opens Nov 5/)).toBeInTheDocument();
		await expect.element(side.getByRole('link', { name: 'participate!' })).not.toBeInTheDocument();
		await expect.element(side.getByText('Closed', { exact: true })).not.toBeInTheDocument();
	});
});
