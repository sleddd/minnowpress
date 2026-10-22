import { describe, expect, it } from 'vitest';
import { MAX_PARAGRAPH_GAP, splitParagraphs } from './paragraphs';

describe('splitParagraphs', () => {
	it('splits on blank lines and keeps single line breaks', () => {
		expect(splitParagraphs('One.\nStill one.\n\nTwo.')).toEqual([
			{ text: 'One.\nStill one.', gap: 0 },
			{ text: 'Two.', gap: 1 }
		]);
	});

	it('remembers extra blank lines, up to a limit', () => {
		expect(splitParagraphs('A\n\n\nB\n  \n \n\n\n\n\nC').map((p) => p.gap)).toEqual([
			0,
			2,
			MAX_PARAGRAPH_GAP
		]);
	});

	it('handles Windows line endings and stray blank space', () => {
		expect(splitParagraphs('\n\nA\r\n\r\nB\n\n')).toEqual([
			{ text: 'A', gap: 0 },
			{ text: 'B', gap: 1 }
		]);
		expect(splitParagraphs('')).toEqual([]);
	});
});
