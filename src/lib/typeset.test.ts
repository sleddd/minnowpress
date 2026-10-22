import { describe, expect, it } from 'vitest';
import { curlyQuotes, typeset } from './typeset';

describe('curlyQuotes', () => {
	it('curls double and single quotes and apostrophes', () => {
		expect(curlyQuotes(`"It doesn't matter," she said. 'Fine.'`)).toBe(
			'“It doesn’t matter,” she said. ‘Fine.’'
		);
		expect(curlyQuotes('("quoted")')).toBe('(“quoted”)');
	});
});

describe('typeset', () => {
	it('turns _underscored_ runs into italics and leaves snake_case alone', () => {
		expect(typeset('It happened _fast_, and my_var stayed.')).toEqual([
			{ text: 'It happened ', em: false },
			{ text: 'fast', em: true },
			{ text: ', and my_var stayed.', em: false }
		]);
	});

	it('handles italics at the edges and curls quotes inside them', () => {
		expect(typeset(`_"I gotchu," battle!_ That was it.`)).toEqual([
			{ text: '“I gotchu,” battle!', em: true },
			{ text: ' That was it.', em: false }
		]);
		expect(typeset('plain')).toEqual([{ text: 'plain', em: false }]);
		expect(typeset('')).toEqual([]);
	});

	it('closes a quote that follows an italic run', () => {
		expect(
			typeset('"_I gotchu, battle!_" That was it.')
				.map((p) => p.text)
				.join('|')
		).toBe('\u201C|I gotchu, battle!|\u201D That was it.');
	});
});
