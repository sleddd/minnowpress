import { describe, expect, it } from 'vitest';
import { AVATAR_TONES, avatarTone } from './avatar';

describe('avatarTone', () => {
	it('is stable for a name, ignoring case and surrounding space', () => {
		expect(avatarTone('Henjo')).toBe(avatarTone(' henjo '));
	});

	it('stays within the palette and spreads names across it', () => {
		const names = Array.from({ length: 200 }, (_, i) => `writer ${i}`);
		const tones = names.map(avatarTone);
		expect(tones.every((t) => t >= 1 && t <= AVATAR_TONES)).toBe(true);
		expect(new Set(tones).size).toBe(AVATAR_TONES);
	});

	it('handles empty and non-latin names', () => {
		expect(avatarTone('')).toBeGreaterThanOrEqual(1);
		expect(avatarTone('物語')).toBeLessThanOrEqual(AVATAR_TONES);
	});
});
