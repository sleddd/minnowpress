import { describe, expect, it } from 'vitest';
import {
	daysLeft,
	excerpt,
	formatDate,
	formatRelative,
	pluralize,
	timeLeft,
	toDate,
	toDateInput
} from './format';

const now = new Date('2026-10-21T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('toDate', () => {
	it('accepts dates, strings, and numbers', () => {
		expect(toDate(now)).toBe(now);
		expect(toDate('2026-10-21T12:00:00Z').getTime()).toBe(now.getTime());
		expect(toDate(now.getTime()).getTime()).toBe(now.getTime());
	});
});

describe('formatRelative', () => {
	it('describes recent times', () => {
		expect(formatRelative(ago(10_000), now)).toBe('just now');
		expect(formatRelative(ago(5 * 60_000), now)).toBe('5m ago');
		expect(formatRelative(ago(3 * 3_600_000), now)).toBe('3h ago');
		expect(formatRelative(ago(2 * 86_400_000), now)).toBe('2d ago');
	});

	it('falls back to a date after a week', () => {
		expect(formatRelative(ago(10 * 86_400_000), now)).toBe('Oct 11');
	});
});

describe('formatDate', () => {
	it('omits the year for this year and includes it otherwise', () => {
		expect(formatDate(new Date('2026-03-05T00:00:00Z'), now)).toBe('Mar 5');
		expect(formatDate(new Date('2024-03-05T00:00:00Z'), now)).toBe('Mar 5, 2024');
	});
});

describe('toDateInput', () => {
	it('formats as yyyy-mm-dd', () => {
		expect(toDateInput(now)).toBe('2026-10-21');
	});
});

describe('pluralize', () => {
	it('chooses singular or plural', () => {
		expect(pluralize(1, 'sequel')).toBe('1 sequel');
		expect(pluralize(0, 'sequel')).toBe('0 sequels');
		expect(pluralize(2, 'story', 'stories')).toBe('2 stories');
	});
});

describe('excerpt', () => {
	it('returns short text unchanged but flattened', () => {
		expect(excerpt('a\n\nb')).toBe('a b');
	});

	it('cuts at a word boundary with an ellipsis', () => {
		expect(excerpt('one two three four five', 15)).toBe('one two three…');
	});

	it('hard-cuts when there is no good boundary', () => {
		expect(excerpt('abcdefghijklmnop', 5)).toBe('abcde…');
	});
});

describe('timeLeft', () => {
	it('describes the time until a deadline', () => {
		expect(timeLeft(new Date(now.getTime() + 4.5 * 86_400_000), now)).toBe('4 days left');
		expect(timeLeft(new Date(now.getTime() + 1.2 * 86_400_000), now)).toBe('1 day left');
		expect(timeLeft(new Date(now.getTime() + 3_600_000), now)).toBe('Last day');
		expect(timeLeft(new Date(now.getTime() - 1), now)).toBe('Closed');
		expect(timeLeft(null, now)).toBeNull();
	});
});

describe('daysLeft', () => {
	it('counts whole days to a deadline', () => {
		const now = new Date('2026-10-21T12:00:00Z');
		expect(daysLeft(new Date('2026-11-04T00:00:00Z'), now)).toBe(13);
		expect(daysLeft(new Date('2026-10-21T20:00:00Z'), now)).toBe(0);
		expect(daysLeft(new Date('2026-10-20T00:00:00Z'), now)).toBeNull();
		expect(daysLeft(null, now)).toBeNull();
	});
});

describe('excerpt punctuation', () => {
	it('does not stack an ellipsis on a full stop', () => {
		expect(excerpt('It was simple. Then it was not simple at all.', 16)).toBe('It was simple…');
	});
});
