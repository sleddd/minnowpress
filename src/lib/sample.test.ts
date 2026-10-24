import { describe, expect, it } from 'vitest';
import { sample } from './sample';

describe('sample', () => {
	it('picks n distinct items in their original order', () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		for (let run = 0; run < 50; run++) {
			const picked = sample(items, 4);
			expect(picked).toHaveLength(4);
			expect(new Set(picked).size).toBe(4);
			expect(picked).toEqual([...picked].sort((a, b) => a - b));
		}
	});

	it('returns everything when there are n or fewer items', () => {
		expect(sample([3, 1, 2], 6)).toEqual([3, 1, 2]);
		expect(sample([], 6)).toEqual([]);
	});

	it('draws from the whole list', () => {
		expect(sample(['a', 'b', 'c', 'd'], 2, () => 0.99)).toEqual(['a', 'd']);
		expect(sample(['a', 'b', 'c', 'd'], 2, () => 0)).toEqual(['a', 'b']);
	});
});
