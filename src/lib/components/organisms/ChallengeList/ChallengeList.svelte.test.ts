import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ChallengeView } from '#lib/types.ts';
import { expectAccessible } from '../../testing/helpers';
import ChallengeList from './ChallengeList.svelte';

const c = (id: number, title: string, o: Partial<ChallengeView> = {}): ChallengeView => ({
	id,
	title,
	promptText: `Prompt for ${title}`,
	source: 'human',
	startsAt: new Date('2026-10-01T00:00:00Z'),
	endsAt: null,
	entries: 0,
	...o
});

const DAY = 86_400_000;

describe('ChallengeList', () => {
	it('shows the open challenge with a countdown, and past challenges in rows', async () => {
		const screen = await render(ChallengeList, {
			open: [
				c(1, 'Fog', {
					entries: 3,
					source: 'ai',
					startsAt: new Date(Date.now() - DAY),
					endsAt: new Date(Date.now() + 13.5 * DAY)
				})
			],
			closed: [
				c(2, 'Rain', {
					entries: 1,
					startsAt: new Date('2026-09-02T12:00:00Z'),
					endsAt: new Date('2026-09-16T12:00:00Z')
				})
			]
		});
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Challenges' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Create a new challenge' }))
			.toHaveAttribute('href', '/challenges/new');
		await expect.element(screen.getByText('open now')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Fog' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('13', { exact: true })).toBeInTheDocument();
		await expect.element(screen.getByText('3 entries')).toBeInTheDocument();
		await expect.element(screen.getByText('AI-suggested prompt')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Enter the challenge' }))
			.toHaveAttribute('href', '/login?next=%2Fwrite%3Fchallenge%3D1');
		await expect
			.element(screen.getByRole('heading', { name: 'Past challenges' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Rain' }))
			.toHaveAttribute('href', '/challenges/2');
		await expect.element(screen.getByText(/Sep 2.*–.*Sep 16/)).toBeInTheDocument();
		await expect.element(screen.getByText('1 entry')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('says when nothing is open or nothing is past yet', async () => {
		const screen = await render(ChallengeList, { open: [], closed: [] });
		await expect.element(screen.getByText(/No challenge is open right now/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('heading', { name: 'Past challenges' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/None yet\./)).toBeInTheDocument();
	});

	it('pages past challenges and hides open ones after page 1', async () => {
		const screen = await render(ChallengeList, {
			open: [],
			closed: [c(2, 'Rain')],
			page: 2,
			hasMore: true,
			url: { href: 'http://localhost/challenges?page=2' }
		});
		await expect.element(screen.getByText(/No challenge is open/)).not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: /Older/ }))
			.toHaveAttribute('href', '/challenges?page=3');
	});

	it('lists challenges coming up, and sends members straight to write', async () => {
		const screen = await render(ChallengeList, {
			open: [c(1, 'Fog', { endsAt: new Date(Date.now() + DAY / 2) })],
			upcoming: [c(3, 'Tide', { startsAt: new Date('2026-11-04T00:00:00Z') })],
			closed: [],
			signedIn: true
		});
		await expect.element(screen.getByText('last day')).toBeInTheDocument();
		await expect.element(screen.getByRole('heading', { name: 'Coming up' })).toBeInTheDocument();
		await expect.element(screen.getByText(/^Starts Nov 4/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Enter the challenge' }))
			.toHaveAttribute('href', '/write?challenge=1');
	});
});

describe('ChallengeList prompts', () => {
	it('lists past and upcoming challenges by title only; the open one shows its prompt', async () => {
		const screen = await render(ChallengeList, {
			open: [c(1, 'Now', { promptText: 'The open prompt.' })],
			upcoming: [c(2, 'Soon', { promptText: 'An upcoming prompt.' })],
			closed: [c(7, 'The Door', { promptText: 'A long past prompt about a door.' })]
		});
		await expect.element(screen.getByRole('link', { name: 'The Door' })).toBeInTheDocument();
		await expect.element(screen.getByText('The open prompt.')).toBeInTheDocument();
		await expect
			.element(screen.getByText('A long past prompt about a door.'))
			.not.toBeInTheDocument();
		await expect.element(screen.getByText('An upcoming prompt.')).not.toBeInTheDocument();
	});
});

describe('ChallengeList archive challenges', () => {
	it('lists Ficly challenges among the past ones, marked as from the archive', async () => {
		const screen = await render(ChallengeList, {
			open: [],
			closed: [
				c(1, 'Ours'),
				c(2, 'Tomb', {
					archiveUrl: 'https://ficly.com/challenges/12/',
					startsAt: new Date('2010-03-01T00:00:00Z'),
					endsAt: new Date('2010-03-15T00:00:00Z')
				})
			]
		});
		await expect
			.element(screen.getByRole('link', { name: 'Tomb' }))
			.toHaveAttribute('href', '/challenges/2');
		const metas = [...screen.container.querySelectorAll('.cell .meta')].map((m) =>
			m.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(metas[0]).not.toMatch(/Ficly/);
		expect(metas[1]).toMatch(/Mar 1, 2010 – Mar 15, 2010 · 0 entries · Ficly/);
	});
});

describe('ChallengeList layout', () => {
	it('lays past challenges out in one, two or three columns as the screen widens', async () => {
		const closed = Array.from({ length: 6 }, (_, i) => c(10 + i, `Past ${i}`));
		const screen = await render(ChallengeList, { open: [], closed });
		const grid = screen.container.querySelector('.grid') as HTMLElement;
		const columns = () => getComputedStyle(grid).gridTemplateColumns.split(' ').length;
		// The test viewport is desktop width.
		expect(columns()).toBe(3);
		expect(grid.querySelectorAll('.cell')).toHaveLength(6);
	});
});
