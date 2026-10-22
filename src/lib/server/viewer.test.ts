import { describe, expect, it } from 'vitest';
import { createTestDb, makeUser } from './testing/db';
import { toViewer } from './viewer';

describe('toViewer', () => {
	it('drops private fields like email', async () => {
		const user = await makeUser(await createTestDb(), {
			email: 'secret@example.com',
			username: 'jane',
			role: 'mod'
		});
		const viewer = toViewer(user);
		expect(viewer).toEqual({
			id: user.id,
			username: 'jane',
			displayName: user.displayName,
			avatarUrl: null,
			role: 'mod',
			showMature: false
		});
		expect(JSON.stringify(viewer)).not.toContain('secret@example.com');
	});

	it('returns null when signed out', () => {
		expect(toViewer(null)).toBeNull();
	});
});
