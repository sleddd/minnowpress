import { isActionFailure, isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { ForbiddenError, NotFoundError, RateLimitError, ValidationError } from './errors';
import {
	formBool,
	formDate,
	formInt,
	formString,
	PAGE_MAX,
	pageParam,
	paramInt,
	queryInt,
	toActionFailure
} from './forms';

const fd = (entries: Record<string, string>) => {
	const data = new FormData();
	for (const [k, v] of Object.entries(entries)) data.set(k, v);
	return data;
};

const caught = (fn: () => unknown) => {
	try {
		return fn();
	} catch (e) {
		return e;
	}
};

describe('form helpers', () => {
	it('formString returns strings and ignores files or missing keys', () => {
		const data = fd({ a: 'x' });
		data.set('f', new Blob(['y']));
		expect(formString(data, 'a')).toBe('x');
		expect(formString(data, 'f')).toBe('');
		expect(formString(data, 'missing')).toBe('');
	});

	it('formInt accepts positive integers only', () => {
		expect(formInt(fd({ n: '12' }), 'n')).toBe(12);
		for (const bad of ['0', '-1', '1.5', 'abc', '', 'Infinity', '1e999', '1e20'])
			expect(formInt(fd({ n: bad }), 'n')).toBeNull();
	});

	it('queryInt and pageParam reject what the database cannot bind', () => {
		expect(queryInt('7')).toBe(7);
		for (const bad of [
			null,
			undefined,
			'',
			' ',
			'0',
			'-3',
			'2.5',
			'x',
			'Infinity',
			'1e999',
			'1e20'
		])
			expect(queryInt(bad)).toBeNull();
		expect(pageParam('3')).toBe(3);
		expect(pageParam(null)).toBe(1);
		expect(pageParam('Infinity')).toBe(1);
		expect(pageParam(String(PAGE_MAX + 5))).toBe(PAGE_MAX);
	});

	it('formBool understands checkbox values', () => {
		expect(formBool(fd({ b: 'on' }), 'b')).toBe(true);
		expect(formBool(fd({ b: 'true' }), 'b')).toBe(true);
		expect(formBool(fd({}), 'b')).toBe(false);
	});

	it('formDate parses date inputs as UTC midnight', () => {
		expect(formDate(fd({ d: '2026-10-22' }), 'd')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
		expect(formDate(fd({ d: '' }), 'd')).toBeNull();
		expect(Number.isNaN(formDate(fd({ d: 'soon' }), 'd')!.getTime())).toBe(true);
	});

	it('paramInt 404s on bad ids', () => {
		expect(paramInt('7')).toBe(7);
		expect(
			isHttpError(
				caught(() => paramInt('1e999')),
				404
			)
		).toBe(true);
		expect(
			isHttpError(
				caught(() => paramInt('x')),
				404
			)
		).toBe(true);
		expect(
			isHttpError(
				caught(() => paramInt(undefined)),
				404
			)
		).toBe(true);
	});
});

describe('toActionFailure', () => {
	it('maps validation errors to a 400 failure with fields and extras', () => {
		const result = toActionFailure(new ValidationError({ title: 'Required' }), {
			values: { title: '' }
		});
		expect(isActionFailure(result)).toBe(true);
		expect(result.status).toBe(400);
		expect(result.data).toEqual({ errors: { title: 'Required' }, values: { title: '' } });
	});

	it('maps a rate limit to a 429 failure with the message as a form error', () => {
		const result = toActionFailure(new RateLimitError(), { values: { title: 'x' } });
		expect(isActionFailure(result)).toBe(true);
		expect(result.status).toBe(429);
		expect(result.data).toEqual({
			values: { title: 'x' },
			errors: { form: new RateLimitError().message }
		});
	});

	it('maps not found and forbidden to HTTP errors', () => {
		expect(
			isHttpError(
				caught(() => toActionFailure(new NotFoundError())),
				404
			)
		).toBe(true);
		expect(
			isHttpError(
				caught(() => toActionFailure(new ForbiddenError())),
				403
			)
		).toBe(true);
	});

	it('rethrows anything else', () => {
		const boom = new Error('boom');
		expect(caught(() => toActionFailure(boom))).toBe(boom);
	});
});
