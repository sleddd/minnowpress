/**
 * A small reader for MySQL dumps written one row per line:
 *
 *   INSERT INTO `stories` (`id`, `title`, …)
 *   VALUES
 *   	(1,'Test','It\'s here',NULL),
 *   	(2,…);
 *
 * It never executes anything. It only tokenizes literal values.
 */

export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;

const ESCAPES: Record<string, string> = {
	n: '\n',
	r: '\r',
	t: '\t',
	'0': '\0',
	Z: '\x1a',
	b: '\b'
};

/** Parses `INSERT INTO \`table\` (\`a\`, \`b\`)` into the table name and column names. */
export function parseInsertHeader(line: string): { table: string; columns: string[] } | null {
	const m = /^INSERT INTO `([^`]+)` \(([^)]*)\)/.exec(line);
	if (!m) return null;
	return { table: m[1], columns: m[2].split(',').map((c) => c.trim().replace(/^`|`$/g, '')) };
}

/** Parses one row line like `\t(1,'a\'b',NULL),` into its values. */
export function parseTuple(line: string): SqlValue[] {
	const s = line.trim();
	if (!s.startsWith('(')) throw new Error(`Not a row: ${s.slice(0, 40)}`);
	const values: SqlValue[] = [];
	let i = 1;
	while (i < s.length) {
		while (s[i] === ' ') i++;
		const ch = s[i];
		if (ch === "'") {
			let out = '';
			i++;
			while (i < s.length && s[i] !== "'") {
				if (s[i] === '\\' && i + 1 < s.length) {
					const next = s[i + 1];
					out += ESCAPES[next] ?? next;
					i += 2;
				} else {
					out += s[i++];
				}
			}
			if (s[i] !== "'") throw new Error('Unterminated string in row');
			values.push(out);
			i++;
		} else {
			let end = i;
			while (end < s.length && s[end] !== ',' && s[end] !== ')') end++;
			const token = s.slice(i, end).trim();
			values.push(token === 'NULL' ? null : Number.isNaN(Number(token)) ? token : Number(token));
			i = end;
		}
		if (s[i] === ',') i++;
		else if (s[i] === ')') return values;
		else if (i >= s.length) break;
		else throw new Error(`Unexpected character in row: ${s[i]}`);
	}
	throw new Error('Row is missing its closing parenthesis');
}

/** Streams rows of the given tables out of a dump, as column → value records. */
export async function* readRows(
	lines: AsyncIterable<string> | Iterable<string>,
	tables: ReadonlySet<string>
): AsyncGenerator<{ table: string; row: SqlRow }> {
	let current: { table: string; columns: string[] } | null = null;
	for await (const line of lines) {
		if (line.startsWith('INSERT INTO ')) {
			const header = parseInsertHeader(line);
			current = header && tables.has(header.table) ? header : null;
			continue;
		}
		if (!current || !line.startsWith('\t(')) continue;
		const values = parseTuple(line);
		const row: SqlRow = {};
		current.columns.forEach((col, idx) => (row[col] = values[idx] ?? null));
		yield { table: current.table, row };
		if (line.trimEnd().endsWith(';')) current = null;
	}
}

/**
 * Splits a text stream on "\n" only. (node:readline also breaks on "\r" and Unicode line
 * separators, which appear unescaped inside some story text and would cut rows in half.)
 */
export async function* splitLines(chunks: AsyncIterable<string | Buffer>): AsyncGenerator<string> {
	const decoder = new TextDecoder();
	let buffer = '';
	for await (const chunk of chunks) {
		buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
		let newline: number;
		while ((newline = buffer.indexOf('\n')) !== -1) {
			yield buffer.slice(0, newline);
			buffer = buffer.slice(newline + 1);
		}
	}
	buffer += decoder.decode();
	if (buffer) yield buffer;
}
