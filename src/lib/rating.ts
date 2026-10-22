/** Fish ratings (1–5). Client-safe helpers. */

export const RATING_MAX = 5;

/** Average to one decimal, or null when nobody has rated yet. */
export function averageRating(count: number, total: number): number | null {
	return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}

/** How many of the five fish to fill for an average (rounded to the nearest whole fish). */
export function filledFish(average: number | null): number {
	return average === null ? 0 : Math.max(0, Math.min(RATING_MAX, Math.round(average)));
}

export function isValidScore(score: unknown): score is number {
	return Number.isInteger(score) && (score as number) >= 1 && (score as number) <= RATING_MAX;
}
