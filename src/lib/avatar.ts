/** Placeholder avatars: no uploads, just a silhouette tinted by name. Client-safe. */

export const AVATAR_TONES = 6;

/** A stable tone (1–6) for a name, so each person keeps the same color everywhere. */
export function avatarTone(name: string): number {
	// FNV-1a over the normalized name
	let hash = 0x811c9dc5;
	for (const ch of name.trim().toLowerCase()) {
		hash ^= ch.codePointAt(0)!;
		hash = Math.imul(hash, 0x01000193);
	}
	return ((hash >>> 0) % AVATAR_TONES) + 1;
}
