import { describe, expect, it } from 'vitest';
import { parseTheme } from './theme';

describe('parseTheme', () => {
	it('accepts the three themes and falls back to light', () => {
		expect(parseTheme('light')).toBe('light');
		expect(parseTheme('dark')).toBe('dark');
		expect(parseTheme('auto')).toBe('auto');
		expect(parseTheme('neon')).toBe('light');
		expect(parseTheme(undefined)).toBe('light');
	});
});
