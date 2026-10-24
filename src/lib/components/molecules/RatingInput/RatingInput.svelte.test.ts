import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import RatingInput from './RatingInput.svelte';

type Result =
	| { type: 'success'; data: { score: number; count: number; average: number | null } }
	| { type: 'failure'; status: number };

/** Saves still on their way to the server; call one with the server's answer to finish it. */
const saves = vi.hoisted(() => [] as ((result: Result) => Promise<void>)[]);
/** How many times a save fell back to reloading the page's data. */
const reloads = vi.hoisted(() => ({ count: 0 }));

// Stands in for SvelteKit's enhance: the form submits without leaving the page, and the save
// finishes only when the test answers it.
vi.mock('$app/forms', () => ({
	enhance(form: HTMLFormElement, submit: (input: { submitter: HTMLElement | null }) => unknown) {
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const after = submit({ submitter: event.submitter }) as (opts: {
				result: Result;
				update: () => Promise<void>;
			}) => Promise<void>;
			saves.push((result) => after({ result, update: async () => void (reloads.count += 1) }));
		});
	}
}));

const saved = (score: number) =>
	({ type: 'success', data: { score, count: 3, average: 4.2 } }) as const;

const lit = (container: HTMLElement) => container.querySelectorAll('button.on').length;

describe('RatingInput', () => {
	it('offers five fish that post a score, showing the current rating', async () => {
		const screen = await render(RatingInput, { storyId: 3, score: 4, signedIn: true });
		const four = screen.getByRole('button', { name: 'Rate 4 out of 5' });
		await expect.element(four).toHaveAttribute('aria-pressed', 'true');
		await expect.element(four).toHaveAttribute('value', '4');
		await expect
			.element(screen.getByRole('button', { name: 'Rate 5 out of 5' }))
			.toHaveAttribute('aria-pressed', 'false');
		expect(screen.container.querySelectorAll('button.on')).toHaveLength(4);
		expect(screen.container.querySelector('form')?.getAttribute('action')).toBe('/s/3?/rate');
		await expectAccessible(screen.container);
	});

	it('shows no fish selected before the reader rates', async () => {
		const screen = await render(RatingInput, { storyId: 3, score: null, signedIn: true });
		expect(screen.container.querySelectorAll('button.on')).toHaveLength(0);
	});

	it('asks signed-out readers to sign in and tells authors they cannot rate', async () => {
		const anon = await render(RatingInput, { storyId: 3, score: null, signedIn: false });
		await expect
			.element(anon.getByRole('link', { name: 'Sign in to rate this story' }))
			.toHaveAttribute('href', '/login?next=/s/3');
		await anon.unmount();
		const author = await render(RatingInput, {
			storyId: 3,
			score: null,
			signedIn: true,
			isAuthor: true
		});
		await expect.element(author.getByText("You can't rate your own story.")).toBeInTheDocument();
		await expect.element(author.getByRole('button')).not.toBeInTheDocument();
	});

	it('lights the fish at once, then shows what was saved without reloading', async () => {
		saves.length = 0;
		reloads.count = 0;
		const onrated = vi.fn();
		const screen = await render(RatingInput, { storyId: 3, score: 2, signedIn: true, onrated });
		await screen.getByRole('button', { name: 'Rate 5 out of 5' }).click();
		await expect.poll(() => lit(screen.container)).toBe(5);

		// The save failed: the page reloads its data, which still has the old rating.
		await saves.shift()!({ type: 'failure', status: 400 });
		await expect.poll(() => lit(screen.container)).toBe(2);
		expect(reloads.count).toBe(1);

		await screen.getByRole('button', { name: 'Rate 4 out of 5' }).click();
		await expect.poll(() => lit(screen.container)).toBe(4);
		await saves.shift()!(saved(4));
		await expect.poll(() => lit(screen.container)).toBe(4);
		expect(onrated).toHaveBeenCalledWith({ score: 4, count: 3, average: 4.2 });
		expect(reloads.count).toBe(1);
	});

	it('keeps the latest click when the reader changes their mind quickly', async () => {
		saves.length = 0;
		const screen = await render(RatingInput, { storyId: 3, score: null, signedIn: true });
		await screen.getByRole('button', { name: 'Rate 3 out of 5' }).click();
		await screen.getByRole('button', { name: 'Rate 5 out of 5' }).click();
		await saves.shift()!(saved(3));
		await expect.poll(() => lit(screen.container)).toBe(5);
		await saves.shift()!(saved(5));
		await expect
			.element(screen.getByRole('button', { name: 'Rate 5 out of 5' }))
			.toHaveAttribute('aria-pressed', 'true');
	});
});
