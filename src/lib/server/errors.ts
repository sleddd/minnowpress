import type { FieldErrors } from '#lib/text.ts';

export class ValidationError extends Error {
	constructor(public fields: FieldErrors & Record<string, string | undefined>) {
		super('Validation failed');
		this.name = 'ValidationError';
	}
}

export class NotFoundError extends Error {
	constructor(what = 'Not found') {
		super(what);
		this.name = 'NotFoundError';
	}
}

export class ForbiddenError extends Error {
	constructor(what = 'Not allowed') {
		super(what);
		this.name = 'ForbiddenError';
	}
}

export const RATE_LIMIT_MESSAGE =
	'You’re posting faster than we allow. Try again in a little while.';

/** The member did this too many times in too short a while. Routes answer with a 429. */
export class RateLimitError extends Error {
	constructor(what = RATE_LIMIT_MESSAGE) {
		super(what);
		this.name = 'RateLimitError';
	}
}
