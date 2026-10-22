const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function toDate(value: Date | string | number): Date {
	return value instanceof Date ? value : new Date(value);
}

/** "just now", "5m ago", "3h ago", "2d ago", then a calendar date. */
export function formatRelative(value: Date | string | number, now = new Date()): string {
	const date = toDate(value);
	const diff = now.getTime() - date.getTime();
	if (diff < MINUTE) return 'just now';
	if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
	if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
	return formatDate(date, now);
}

/** "Oct 3" this year, "Oct 3, 2024" otherwise. Always UTC so server and client agree. */
export function formatDate(value: Date | string | number, now = new Date()): string {
	const date = toDate(value);
	const sameYear = date.getUTCFullYear() === now.getUTCFullYear();
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: sameYear ? undefined : 'numeric',
		timeZone: 'UTC'
	});
}

/** yyyy-mm-dd for <input type="date">. */
export function toDateInput(value: Date | string | number): string {
	return toDate(value).toISOString().slice(0, 10);
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
	return `${n} ${n === 1 ? one : many}`;
}

export function excerpt(text: string, max = 240): string {
	const flat = text.replace(/\s+/g, ' ').trim();
	if (flat.length <= max) return flat;
	const cut = flat.slice(0, max);
	const space = cut.lastIndexOf(' ');
	// Drop trailing punctuation so it reads "simple…", not "simple.…".
	return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd().replace(/[.,;:!?…-]+$/, '')}…`;
}

/** Whole days until a deadline (0 on the last day), or null when there's none or it has passed. */
export function daysLeft(endsAt: Date | string | number | null, now = new Date()): number | null {
	if (endsAt === null) return null;
	const ms = toDate(endsAt).getTime() - now.getTime();
	return ms <= 0 ? null : Math.floor(ms / DAY);
}

/** "4 days left", "Last day", or "Closed" for a challenge deadline. */
export function timeLeft(endsAt: Date | string | number | null, now = new Date()): string | null {
	if (endsAt === null) return null;
	const ms = toDate(endsAt).getTime() - now.getTime();
	if (ms <= 0) return 'Closed';
	const days = Math.floor(ms / DAY);
	return days < 1 ? 'Last day' : `${pluralize(days, 'day')} left`;
}
