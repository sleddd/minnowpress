import { describe, expect, it } from 'vitest';
import {
	countGraphemes,
	normalizeBody,
	parseTags,
	STORY_MAX,
	STORY_MIN,
	validateComment,
	validateStoryBody,
	validateStoryInput,
	validateTags,
	validateTitle,
	validateUsername
} from './text';

describe('countGraphemes', () => {
	it('counts plain ASCII', () => {
		expect(countGraphemes('hello')).toBe(5);
	});

	it('counts an emoji as one character', () => {
		expect(countGraphemes('👍')).toBe(1);
		expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1);
		expect(countGraphemes('🇺🇸')).toBe(1);
	});

	it('counts combining marks with their letter', () => {
		expect(countGraphemes('é')).toBe(1);
	});

	it('counts the empty string as zero', () => {
		expect(countGraphemes('')).toBe(0);
	});
});

describe('normalizeBody', () => {
	it('converts CRLF to LF and trims', () => {
		expect(normalizeBody('  a\r\nb\rc  ')).toBe('a\nb\nc');
	});
});

describe('validateStoryBody', () => {
	it('accepts exactly the limit', () => {
		expect(validateStoryBody('a'.repeat(STORY_MAX))).toBeUndefined();
	});

	it('rejects one over the limit', () => {
		expect(validateStoryBody('a'.repeat(STORY_MAX + 1))).toMatch(/1025/);
	});

	it('accepts 1024 emoji even though they are many more code units', () => {
		expect(validateStoryBody('👍'.repeat(STORY_MAX))).toBeUndefined();
	});

	it('requires at least 60 characters, like Ficly', () => {
		expect(validateStoryBody('a'.repeat(STORY_MIN - 1))).toMatch(/at least 60/);
		expect(validateStoryBody('a'.repeat(STORY_MIN))).toBeUndefined();
	});

	it('rejects an empty or whitespace body', () => {
		expect(validateStoryBody('   \n ')).toBeDefined();
	});

	it('does not count surrounding whitespace', () => {
		expect(validateStoryBody(`  ${'a'.repeat(STORY_MAX)}  \n`)).toBeUndefined();
	});
});

describe('validateTitle', () => {
	it('requires a title', () => {
		expect(validateTitle('  ')).toBeDefined();
	});

	it('limits title length', () => {
		expect(validateTitle('a'.repeat(100))).toBeUndefined();
		expect(validateTitle('a'.repeat(101))).toBeDefined();
	});
});

describe('validateComment', () => {
	it('rejects empty and over-long comments', () => {
		expect(validateComment('')).toBeDefined();
		expect(validateComment('a'.repeat(1025))).toBeDefined();
		expect(validateComment('nice')).toBeUndefined();
	});
});

describe('parseTags', () => {
	it('lowercases, slugs, and de-duplicates', () => {
		expect(parseTags('Sci-Fi, space opera,  sci-fi')).toEqual(['sci-fi', 'space-opera']);
	});

	it('drops punctuation and empty entries', () => {
		expect(parseTags('!!, #horror, , --x--')).toEqual(['horror', 'x']);
	});

	it('keeps non-latin letters', () => {
		expect(parseTags('café, 物語')).toEqual(['café', '物語']);
	});

	it('returns nothing for an empty string', () => {
		expect(parseTags('')).toEqual([]);
	});
});

describe('validateTags', () => {
	it('allows up to five tags', () => {
		expect(validateTags(['a', 'b', 'c', 'd', 'e'])).toBeUndefined();
		expect(validateTags(['a', 'b', 'c', 'd', 'e', 'f'])).toBeDefined();
	});

	it('limits tag length', () => {
		expect(validateTags(['a'.repeat(31)])).toBeDefined();
	});
});

describe('validateStoryInput', () => {
	it('returns no errors for valid input', () => {
		expect(validateStoryInput({ title: 'T', body: 'B'.repeat(STORY_MIN), tags: [] })).toEqual({});
	});

	it('returns an error per invalid field', () => {
		const errors = validateStoryInput({ title: '', body: '', tags: Array(6).fill('x') });
		expect(Object.keys(errors).sort()).toEqual(['body', 'tags', 'title']);
	});
});

describe('validateUsername', () => {
	it('accepts lowercase letters, digits and underscores', () => {
		expect(validateUsername('jane_doe42')).toBeUndefined();
	});

	it('rejects bad characters and lengths', () => {
		expect(validateUsername('Jane')).toBeDefined();
		expect(validateUsername('ab')).toBeDefined();
		expect(validateUsername('a'.repeat(21))).toBeDefined();
		expect(validateUsername('jane-doe')).toBeDefined();
	});
});
