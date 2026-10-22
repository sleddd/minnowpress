import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError, ValidationError } from './errors';

describe('errors', () => {
	it('ValidationError carries field errors', () => {
		const e = new ValidationError({ body: 'too long' });
		expect(e).toBeInstanceOf(Error);
		expect(e.name).toBe('ValidationError');
		expect(e.fields.body).toBe('too long');
	});

	it('NotFoundError and ForbiddenError have names and default messages', () => {
		expect(new NotFoundError().message).toBe('Not found');
		expect(new NotFoundError('Story').message).toBe('Story');
		expect(new ForbiddenError().name).toBe('ForbiddenError');
		expect(new ForbiddenError().message).toBe('Not allowed');
	});
});
