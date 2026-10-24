import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { createSession, SESSION_COOKIE } from './auth';
import { referralVisits, sessions, users } from './db/schema';
import { createHandle } from './handle';
import { REFERRAL_COOKIE } from './referrals';
import { THEME_COOKIE } from './theme-cookie';
import { createTestDb, makeUser } from './testing/db';

function fakeEvent(cookie?: string, opts: { userAgent?: string; path?: string } = {}) {
	const jar = new Map<string, string>(cookie ? [[SESSION_COOKIE, cookie]] : []);
	const url = new URL(opts.path ?? '/', 'http://localhost');
	return {
		locals: {} as App.Locals,
		url,
		request: new Request(url, {
			headers: opts.userAgent === undefined ? {} : { 'user-agent': opts.userAgent }
		}),
		cookies: {
			get: (name: string) => jar.get(name),
			set: vi.fn((name: string, value: string) => void jar.set(name, value)),
			delete: vi.fn((name: string) => void jar.delete(name))
		}
	};
}

const run = async (
	handle: ReturnType<typeof createHandle>,
	event: ReturnType<typeof fakeEvent>
) => {
	const resolve = vi.fn(async () => new Response('ok'));
	const response = await handle({ event: event as never, resolve: resolve as never });
	return { response, resolve };
};

describe('createHandle', () => {
	it('leaves anonymous requests signed out and adds security headers', async () => {
		const db = await createTestDb();
		const event = fakeEvent();
		const { response, resolve } = await run(createHandle(db, { secure: true }), event);
		expect(event.locals.user).toBeNull();
		expect(resolve).toHaveBeenCalledOnce();
		expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(response.headers.get('Strict-Transport-Security')).toContain('max-age');
	});

	it('loads the user from a valid session and refreshes the cookie', async () => {
		const db = await createTestDb();
		const user = await makeUser(db);
		const { token } = await createSession(db, user.id);
		const event = fakeEvent(token);
		await run(createHandle(db, { secure: true }), event);
		expect(event.locals.user?.id).toBe(user.id);
		expect(event.cookies.set).toHaveBeenCalledWith(
			SESSION_COOKIE,
			token,
			expect.objectContaining({ httpOnly: true, secure: true })
		);
	});

	it('turns away crawlers other than the allowed search engines, before touching the database', async () => {
		const db = await createTestDb();
		const user = await makeUser(db);
		const { token } = await createSession(db, user.id);
		const bot = fakeEvent(token, { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.0)' });
		const { response, resolve } = await run(createHandle(db, { secure: true }), bot);
		expect(response.status).toBe(403);
		expect(response.headers.get('X-Frame-Options')).toBe('DENY');
		expect(resolve).not.toHaveBeenCalled();
		expect(bot.locals.user).toBeNull();
		expect(bot.cookies.set).not.toHaveBeenCalled();

		const google = fakeEvent(undefined, {
			userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
		});
		expect((await run(createHandle(db, { secure: true }), google)).response.status).toBe(200);

		// The API answers to its own secret; a script calling it with curl is not a crawler.
		const api = fakeEvent(undefined, { userAgent: 'curl/8.7.1', path: '/api/diagnose' });
		expect((await run(createHandle(db, { secure: true }), api)).response.status).toBe(200);
	});

	it('counts a visit by a ?ref= link', async () => {
		const db = await createTestDb();
		const event = fakeEvent(undefined, { path: '/?ref=bookfair' });
		await run(createHandle(db, { secure: true }), event);
		expect(await db.select().from(referralVisits)).toMatchObject([{ code: 'bookfair' }]);
		expect(event.cookies.get(REFERRAL_COOKIE)).toBe('bookfair');
	});

	it('clears an invalid session cookie', async () => {
		const db = await createTestDb();
		const event = fakeEvent('stale');
		await run(createHandle(db, { secure: false }), event);
		expect(event.locals.user).toBeNull();
		expect(event.cookies.delete).toHaveBeenCalledWith(SESSION_COOKIE, { path: '/' });
	});

	it("renders the member's theme into the page, and light for visitors", async () => {
		const db = await createTestDb();
		const html = '<html data-theme="%theme%">';
		const render = async (cookie?: string) => {
			const resolve = vi.fn(
				async (_e: unknown, opts: { transformPageChunk: (c: { html: string }) => string }) =>
					new Response(opts.transformPageChunk({ html }))
			);
			const response = await createHandle(db, { secure: true })({
				event: fakeEvent(cookie) as never,
				resolve: resolve as never
			});
			return response.text();
		};
		const user = await makeUser(db, { theme: 'dark' });
		const { token } = await createSession(db, user.id);
		expect(await render(token)).toBe('<html data-theme="dark">');
		expect(await render()).toBe('<html data-theme="light">');
		const auto = await makeUser(db, { theme: 'auto' });
		expect(await render((await createSession(db, auto.id)).token)).toBe('<html data-theme="">');
	});

	it('renders a visitor’s sun choice from their cookie', async () => {
		const db = await createTestDb();
		const event = fakeEvent();
		event.cookies.get = (name: string) => (name === THEME_COOKIE ? 'dark' : undefined);
		const resolve = vi.fn(
			async (_e: unknown, opts: { transformPageChunk: (c: { html: string }) => string }) =>
				new Response(opts.transformPageChunk({ html: '<html data-theme="%theme%">' }))
		);
		const response = await createHandle(db, { secure: true })({
			event: event as never,
			resolve: resolve as never
		});
		expect(await response.text()).toBe('<html data-theme="dark">');
	});

	it('keeps staff powers off until this sign-in passes two-step sign-in', async () => {
		const db = await createTestDb();
		const admin = await makeUser(db, { role: 'admin' });
		const { token } = await createSession(db, admin.id);
		let event = fakeEvent(token);
		await run(createHandle(db, { secure: true }), event);
		expect(event.locals.user?.role).toBe('user');
		expect(event.locals.staffLock).toBe('enroll');

		await db.update(users).set({ totpEnabledAt: new Date() }).where(eq(users.id, admin.id));
		event = fakeEvent(token);
		await run(createHandle(db, { secure: true }), event);
		expect(event.locals.staffLock).toBe('verify');
		expect(event.locals.user?.role).toBe('user');

		await db.update(sessions).set({ twoFactorAt: new Date() });
		event = fakeEvent(token);
		await run(createHandle(db, { secure: true }), event);
		expect(event.locals.staffLock).toBeNull();
		expect(event.locals.user?.role).toBe('admin');
	});

	it('never locks ordinary members', async () => {
		const db = await createTestDb();
		const member = await makeUser(db);
		const { token } = await createSession(db, member.id);
		const event = fakeEvent(token);
		await run(createHandle(db, { secure: true }), event);
		expect(event.locals.staffLock).toBeNull();
		expect(event.locals.user?.role).toBe('user');
	});
});
