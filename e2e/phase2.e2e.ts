import { expect, test, type Page } from '@playwright/test';
import { importFicly, readFiclyDump } from '../src/lib/server/archive/ficly.ts';
import { createLoginToken } from '../src/lib/server/auth.ts';
import { db, signIn, signOut, signUp, writeStory } from './helpers';

/** A Chromium virtual authenticator, so real WebAuthn ceremonies run without hardware. */
async function addVirtualAuthenticator(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('WebAuthn.enable');
	await cdp.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'internal',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true
		}
	});
}

test('passkeys: add one in settings, then sign in with it', async ({ page }) => {
	await addVirtualAuthenticator(page);
	await signUp(page, 'pat@example.com', 'pat');
	await page.goto('/settings');
	await page.getByRole('textbox', { name: /Name this passkey/ }).fill('Test device');
	await page.getByRole('button', { name: 'Add a passkey' }).click();
	await expect(page.getByText('Test device')).toBeVisible();
	await signOut(page);

	// The email field offers the passkey through browser autofill; the virtual authenticator
	// accepts that offer straight away, so just opening the page signs in.
	await page.goto('/login?next=/reading-list');
	await page.waitForURL('**/reading-list');
	await expect(page.getByRole('heading', { name: 'Reading list' })).toBeVisible();

	await page.goto('/settings');
	await expect(page.getByText(/last used/)).toBeVisible();
	await page.getByRole('button', { name: 'Remove Test device' }).click();
	await expect(page.getByText('Test device')).toHaveCount(0);
});

test('bookmarks: save a story and find it on the reading list', async ({ page }) => {
	await signUp(page, 'quinn@example.com', 'quinn');
	await page.goto('/write');
	await writeStory(page, 'Worth Rereading', 'A story to come back to.');
	const url = page.url();
	await signOut(page);

	await signUp(page, 'rae@example.com', 'rae');
	await page.goto(url);
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('link', { name: 'Your desk' }).click();
	await page.getByRole('link', { name: 'Reading list' }).click();
	await expect(page.getByRole('link', { name: 'Worth Rereading' })).toBeVisible();
});

test('email settings are saved', async ({ page }) => {
	await signUp(page, 'sam@example.com', 'sam');
	await page.goto('/settings');
	const digest = page.getByRole('checkbox', { name: /Weekly digest/ });
	await expect(digest).not.toBeChecked();
	await digest.check();
	await page.getByRole('checkbox', { name: /comments on my story/ }).uncheck();
	await page.getByRole('button', { name: 'Save email settings' }).click();
	await expect(page.getByText('Email settings saved.')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('checkbox', { name: /Weekly digest/ })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: /comments on my story/ })).not.toBeChecked();
});

test('Atom feeds list published stories', async ({ page, request }) => {
	await signUp(page, 'tess@example.com', 'tess');
	await page.goto('/write');
	await writeStory(page, 'Feed Me', 'Syndicated & escaped <text>.', { tags: 'feeds' });

	for (const path of ['/feed.xml', '/tags/feeds/feed.xml', '/@tess/feed.xml']) {
		const res = await request.get(path);
		expect(res.status(), path).toBe(200);
		expect(res.headers()['content-type']).toContain('application/atom+xml');
		const xml = await res.text();
		expect(xml).toContain('<title>Feed Me</title>');
		expect(xml).toContain('Syndicated &amp; escaped &lt;text&gt;.');
	}
	expect((await request.get('/@nobody-here/feed.xml')).status()).toBe(404);
	await expect(page.locator('link[rel="alternate"][type="application/atom+xml"]')).toHaveCount(0);
	await page.goto('/tags/feeds');
	await expect(page.locator('link[rel="alternate"][type="application/atom+xml"]')).toHaveAttribute(
		'href',
		'/tags/feeds/feed.xml'
	);
});

test('archive stories are credited and can be continued', async ({ page }) => {
	const dump = await readFiclyDump([
		'INSERT INTO `users` (`id`, `name`, `uri_name`)',
		"\t(1,'Kevin Lawver','kevin-lawver');",
		'INSERT INTO `stories` (`id`, `title`, `body`, `published_at`, `is_draft`, `sequel_to`, `prequel_to`, `user_id`, `is_deleted`, `is_mature`)',
		"\t(900001,'From the Archive','\\\"This is only a test.\\\"','2009-05-16 20:41:33',0,NULL,NULL,1,0,0);"
	]);
	await importFicly(db, dump);

	await signIn(page, 'tess@example.com');
	await page.goto('/@ficly_archive');
	await page.getByRole('link', { name: 'From the Archive' }).click();
	await expect(page.getByRole('link', { name: 'Kevin Lawver' }).first()).toHaveAttribute(
		'href',
		'/authors/ficly/kevin-lawver'
	);
	await expect(page.getByText(/Originally published on Ficly/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Read the original' })).toHaveAttribute(
		'href',
		'https://ficly.com/stories/900001/'
	);
	await page.getByRole('link', { name: 'Write a sequel' }).click();
	await writeStory(page, 'Decades Later', 'The test was still running.');
	await expect(
		page.getByRole('region', { name: 'Prequels' }).getByRole('link', { name: 'From the Archive' })
	).toBeVisible();
});

test('the archive account cannot sign in', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('textbox', { name: 'Email' }).fill('archive@ficly.invalid');
	await page.getByRole('button', { name: 'Email me a link' }).click();
	// A link is "sent" (no account enumeration), but using one fails.
	await expect(page.getByRole('status')).toContainText('archive@ficly.invalid');
	const token = await createLoginToken(db, 'archive@ficly.invalid');
	await page.goto(`/login/verify?token=${token}`);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toContainText('invalid or has expired');
	await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('the digest cron requires the secret', async ({ request }) => {
	expect((await request.get('/api/cron/digest')).status()).toBe(401);
	const ok = await request.get('/api/cron/digest', {
		headers: { authorization: 'Bearer e2e-secret' }
	});
	expect(await ok.json()).toMatchObject({ ok: true });
});
