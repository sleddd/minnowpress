/** Most blank lines kept between two paragraphs; more than this is treated as this many. */
export const MAX_PARAGRAPH_GAP = 3;

export interface Paragraph {
	text: string;
	/** Blank lines the author left before this paragraph (0 for the first). */
	gap: number;
}

/**
 * Splits a story into paragraphs on blank lines, remembering how many blank lines separated
 * them so the spacing shows as written. Single line breaks stay inside a paragraph.
 */
export function splitParagraphs(text: string): Paragraph[] {
	const parts = text.replace(/\r\n?/g, '\n').split(/(\n[^\S\n]*(?:\n[^\S\n]*)+)/);
	const paragraphs: Paragraph[] = [];
	let gap = 0;
	for (let i = 0; i < parts.length; i++) {
		if (i % 2 === 1) {
			gap = Math.min(MAX_PARAGRAPH_GAP, parts[i].split('\n').length - 2);
			continue;
		}
		if (!parts[i].trim()) continue;
		paragraphs.push({ text: parts[i], gap: paragraphs.length ? gap : 0 });
	}
	return paragraphs;
}
