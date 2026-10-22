import { error, fail } from '@sveltejs/kit';
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from './errors';

export function formString(data: FormData, key: string): string {
	const value = data.get(key);
	return typeof value === 'string' ? value : '';
}

/** A positive integer, or null when missing or malformed. */
export function formInt(data: FormData, key: string): number | null {
	const value = Number(formString(data, key));
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function formBool(data: FormData, key: string): boolean {
	const value = formString(data, key);
	return value === 'on' || value === 'true' || value === '1';
}

/** Parses a yyyy-mm-dd date input as midnight UTC. Empty → null; garbage → Invalid Date. */
export function formDate(data: FormData, key: string): Date | null {
	const value = formString(data, key).trim();
	if (!value) return null;
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(NaN);
}

export function paramInt(value: string | undefined): number {
	const n = Number(value);
	if (!Number.isSafeInteger(n) || n <= 0) error(404, 'Not found');
	return n;
}

/**
 * A positive integer from a query string, or null. `Infinity` and `1e999` are numbers too, but
 * the database driver refuses to bind them, so only safe integers get through.
 */
export function queryInt(value: string | null | undefined): number | null {
	if (!value?.trim()) return null;
	const n = Number(value);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** The deepest page anyone can ask for; a larger offset only costs database reads. */
export const PAGE_MAX = 10_000;

/** The `?page=` number, from 1 to PAGE_MAX. Anything else is page 1. */
export function pageParam(value: string | null | undefined): number {
	return Math.min(queryInt(value) ?? 1, PAGE_MAX);
}

/**
 * Turns domain errors into HTTP responses: validation → a 400 form failure carrying field errors,
 * rate limit → a 429 failure with the message as a form error, not found → 404, forbidden → 403.
 * Anything else is rethrown.
 */
export function toActionFailure<T extends object = Record<never, never>>(e: unknown, extra?: T) {
	if (e instanceof ValidationError)
		return fail(400, { ...(extra as T), errors: e.fields as Record<string, string | undefined> });
	if (e instanceof RateLimitError)
		return fail(429, {
			...(extra as T),
			errors: { form: e.message } as Record<string, string | undefined>
		});
	if (e instanceof NotFoundError) error(404, e.message);
	if (e instanceof ForbiddenError) error(403, e.message);
	throw e;
}
