import { describe, expect, it } from 'vitest';
import { averageRating, filledFish, isValidScore, RATING_MAX } from './rating';

describe('averageRating', () => {
	it('averages to one decimal', () => {
		expect(averageRating(3, 13)).toBe(4.3);
		expect(averageRating(20, 100)).toBe(5);
	});

	it('is null with no ratings', () => {
		expect(averageRating(0, 0)).toBeNull();
	});
});

describe('filledFish', () => {
	it('rounds to whole fish within bounds', () => {
		expect(filledFish(4.4)).toBe(4);
		expect(filledFish(4.5)).toBe(5);
		expect(filledFish(null)).toBe(0);
		expect(filledFish(9)).toBe(RATING_MAX);
		expect(filledFish(-1)).toBe(0);
	});
});

describe('isValidScore', () => {
	it('accepts integers 1 through 5 only', () => {
		for (const ok of [1, 2, 3, 4, 5]) expect(isValidScore(ok)).toBe(true);
		for (const bad of [0, 6, 2.5, '3', null]) expect(isValidScore(bad)).toBe(false);
	});
});
