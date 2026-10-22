import type { Viewer } from '#lib/types.ts';
import type { User } from './db/schema';

/** The subset of the user that is safe to send to the browser (no email). */
export function toViewer(user: User | null): Viewer | null {
	if (!user) return null;
	const { id, username, displayName, avatarUrl, role, showMature } = user;
	return { id, username, displayName, avatarUrl, role, showMature };
}
