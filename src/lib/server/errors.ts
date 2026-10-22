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
