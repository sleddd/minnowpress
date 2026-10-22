/** Light typesetting for display: curly quotes, and Ficly-style _underscores_ as italics. Client-safe. */

export interface TypesetPart {
	text: string;
	/** Shown in italics (from _underscores_ in the original). */
	em: boolean;
}

/**
 * Straight quotes to curly ones. A quote opens when it follows the start of the text, a space,
 * an opening bracket, a dash, or an underscore (and isn't followed by a space); otherwise it closes.
 */
export function curlyQuotes(text: string): string {
	const opensAfter = /[\s([{\u2014\-_]/;
	let out = '';
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch !== '"' && ch !== "'") {
			out += ch;
			continue;
		}
		const prev = text[i - 1];
		const next = text[i + 1];
		const opening =
			(prev === undefined || opensAfter.test(prev)) && next !== undefined && !/\s/.test(next);
		out += ch === '"' ? (opening ? '\u201C' : '\u201D') : opening ? '\u2018' : '\u2019';
	}
	return out;
}

/**
 * Splits text into plain and italic runs. `_like this_` (Ficly's habit) becomes italic; underscores
 * inside words, like snake_case, are left alone. Quotes are curled throughout.
 */
export function typeset(raw: string): TypesetPart[] {
	// Curl first, across the whole text, so a quote right after an italic run reads as closing.
	const text = curlyQuotes(raw);
	const parts: TypesetPart[] = [];
	const pattern = /(^|[^\p{L}\p{N}_])_([^_\n]+?)_(?=$|[^\p{L}\p{N}_])/gu;
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		const start = match.index + match[1].length;
		if (start > last) parts.push({ text: text.slice(last, start), em: false });
		parts.push({ text: match[2], em: true });
		last = start + match[2].length + 2;
	}
	if (last < text.length) parts.push({ text: text.slice(last), em: false });
	return parts;
}
