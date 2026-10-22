import { describe, expect, it, vi } from 'vitest';
import { createSession, SESSION_COOKIE } from './auth';
import { createHandle } from './handle';
import { createTestDb, makeUser } from './testing/db';

function fakeEvent(cookie?: string) {
	const jar = new Map<string, string>(cookie ? [[SESSION_COOKIE, cookie]] : []);
	return {
		locals: {} as App.Locals,
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
});
