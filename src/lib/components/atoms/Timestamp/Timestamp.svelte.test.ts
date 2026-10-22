import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Timestamp from './Timestamp.svelte';

const now = new Date('2026-10-21T12:00:00Z');

describe('Timestamp', () => {
	it('renders a relative time with a machine-readable datetime', async () => {
		const date = new Date(now.getTime() - 3 * 3_600_000);
		const screen = await render(Timestamp, { date, now });
		const time = screen.container.querySelector('time')!;
		expect(time.textContent?.trim()).toBe('3h ago');
		expect(time.getAttribute('datetime')).toBe(date.toISOString());
	});

	it('can render an absolute date from a string', async () => {
		const screen = await render(Timestamp, { date: '2024-03-05T00:00:00Z', relative: false, now });
		expect(screen.container.querySelector('time')?.textContent?.trim()).toBe('Mar 5, 2024');
	});
});
