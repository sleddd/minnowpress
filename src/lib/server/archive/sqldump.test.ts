import { describe, expect, it } from 'vitest';
import { parseInsertHeader, parseTuple, readRows, splitLines } from './sqldump';

describe('parseInsertHeader', () => {
	it('reads the table and columns', () => {
		expect(parseInsertHeader('INSERT INTO `stories` (`id`, `title`, `body`)')).toEqual({
			table: 'stories',
			columns: ['id', 'title', 'body']
		});
	});

	it('ignores other lines', () => {
		expect(parseInsertHeader('CREATE TABLE `stories` (')).toBeNull();
	});
});

describe('parseTuple', () => {
	it('parses numbers, NULL, and strings', () => {
		expect(parseTuple("\t(1,'Test',NULL,4.6,-20),")).toEqual([1, 'Test', null, 4.6, -20]);
	});

	it('unescapes MySQL escapes', () => {
		expect(parseTuple(String.raw`	(1,'It\'s a \"test\"\n\r\tback\\slash\0\Z\b'),`)).toEqual([
			1,
			'It\'s a "test"\n\r\tback\\slash\0\x1a\b'
		]);
	});

	it('keeps commas and parentheses inside strings', () => {
		expect(parseTuple("\t('a, (b)', 'c)')")).toEqual(['a, (b)', 'c)']);
	});

	it('handles empty strings and the last row of a block', () => {
		expect(parseTuple("\t('',2);")).toEqual(['', 2]);
	});

	it('rejects malformed rows', () => {
		expect(() => parseTuple('VALUES')).toThrow('Not a row');
		expect(() => parseTuple("\t('open")).toThrow('Unterminated');
		expect(() => parseTuple('\t(1,2')).toThrow('closing parenthesis');
		expect(() => parseTuple("\t('a'x)")).toThrow('Unexpected');
	});
});

describe('readRows', () => {
	const dump = [
		'CREATE TABLE `stories` (',
		'INSERT INTO `stories` (`id`, `title`)',
		'VALUES',
		"\t(1,'One'),",
		"\t(2,'Two');",
		'INSERT INTO `ratings` (`id`, `score`)',
		'VALUES',
		'\t(1,5);',
		'INSERT INTO `users` (`id`, `name`)',
		'VALUES',
		"\t(7,'Kevin');",
		"\t(8,'after the block ended');"
	];

	it('yields rows of the requested tables as records', async () => {
		const rows = [];
		for await (const r of readRows(dump, new Set(['stories', 'users']))) rows.push(r);
		expect(rows).toEqual([
			{ table: 'stories', row: { id: 1, title: 'One' } },
			{ table: 'stories', row: { id: 2, title: 'Two' } },
			{ table: 'users', row: { id: 7, name: 'Kevin' } }
		]);
	});

	it('fills missing trailing values with null', async () => {
		const rows = [];
		for await (const r of readRows(['INSERT INTO `t` (`a`, `b`)', '\t(1);'], new Set(['t'])))
			rows.push(r);
		expect(rows[0].row).toEqual({ a: 1, b: null });
	});
});

describe('splitLines', () => {
	async function* chunks(...parts: (string | Buffer)[]) {
		yield* parts;
	}
	const collect = async (it: AsyncIterable<string>) => {
		const out = [];
		for await (const l of it) out.push(l);
		return out;
	};

	it('splits on newlines across chunk boundaries and keeps a trailing line', async () => {
		expect(await collect(splitLines(chunks('a\nb', 'c\nd')))).toEqual(['a', 'bc', 'd']);
	});

	it('keeps carriage returns and unicode separators inside lines', async () => {
		expect(await collect(splitLines(chunks('x\ry\u2028z\n')))).toEqual(['x\ry\u2028z']);
	});

	it('decodes multibyte characters split across buffers', async () => {
		const bytes = Buffer.from('café\n');
		expect(await collect(splitLines(chunks(bytes.subarray(0, 4), bytes.subarray(4))))).toEqual([
			'café'
		]);
	});
});
