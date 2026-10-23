import { describe, expect, it, vi } from 'vitest';
import { THEME_COOKIE, requestTheme, saveTheme } from './theme-cookie';
import { createTestDb, makeUser } from './testing/db';

describe('requestTheme', () => {
	it('prefers the member’s choice, then the visitor’s cookie, then light', () => {
		expect(requestTheme({ theme: 'dark' }, 'light')).toBe('dark');
		expect(requestTheme(null, 'dark')).toBe('dark');
		expect(requestTheme(null, 'neon')).toBe('light');
		expect(requestTheme(null, undefined)).toBe('light');
	});
});

describe('saveTheme', () => {
	it('saves a member’s choice on their account, not in a cookie', async () => {
		const db = await createTestDb();
		const user = await makeUser(db);
		const cookies = { set: vi.fn() };
		const saved = await saveTheme(db, user, cookies, 'dark', true);
		expect(saved?.theme).toBe('dark');
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('keeps a visitor’s choice in a year-long cookie', async () => {
		const db = await createTestDb();
		const cookies = { set: vi.fn() };
		expect(await saveTheme(db, null, cookies, 'dark', true)).toBeNull();
		expect(cookies.set).toHaveBeenCalledWith(
			THEME_COOKIE,
			'dark',
			expect.objectContaining({ path: '/', httpOnly: true, secure: true, maxAge: 31_536_000 })
		);
	});
});
