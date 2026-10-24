/**
 * Up to `n` items picked at random, kept in their original order, so a sorted list stays
 * sorted (the best-rated still lead, the newest still come first).
 */
export function sample<T>(items: readonly T[], n: number, random = Math.random): T[] {
	const picked = new Set<number>();
	const indexes = items.map((_, i) => i);
	// A partial Fisher–Yates shuffle: only the first n positions are drawn.
	for (let i = 0; i < Math.min(n, indexes.length); i++) {
		const j = i + Math.floor(random() * (indexes.length - i));
		[indexes[i], indexes[j]] = [indexes[j], indexes[i]];
		picked.add(indexes[i]);
	}
	return items.filter((_, i) => picked.has(i));
}
