import { expect, test } from '@playwright/test';
import { createLoginToken } from '../src/lib/server/auth.ts';
import { currentCode, db, signIn, signInAsStaff, signOut, signUp, writeStory } from './helpers';

test('a story reported as AI-generated can be removed by an admin', async ({ page }) => {
	await signUp(page, 'dave@example.com', 'dave');
	await page.goto('/write');
	await writeStory(page, 'Suspicious Prose', 'As an AI language model, I cannot feel the sea.');
	const storyUrl = page.url();
	await signOut(page);

	await signUp(page, 'erin@example.com', 'erin');
	await page.goto(storyUrl);
	await page.getByText('Report', { exact: true }).click();
	await page.getByRole('combobox', { name: 'Reason' }).selectOption('ai_generated');
	await page.getByRole('button', { name: 'Send report' }).click();
	await expect(page.getByText('A moderator will take a look.')).toBeVisible();
	await signOut(page);

	// ADMIN_EMAILS makes this account an admin on sign-up. Its staff tools stay locked until
	// it sets up two-step sign-in.
	await signUp(page, 'admin@example.com', 'editor');
	await expect(page.getByText(/tools stay locked until you/)).toBeVisible();
	await page.goto('/admin/reports');
	await expect(page).toHaveURL(/\/settings#two-factor$/);
	const twoFactor = page.getByRole('region', { name: 'Two-step sign-in' });
	await expect(twoFactor.getByRole('img', { name: /QR code/ })).toBeVisible();
	const secret = (await twoFactor.locator('code').first().textContent()) ?? '';
	await twoFactor.getByRole('textbox', { name: 'Code from your app' }).fill(currentCode(secret));
	await twoFactor.getByRole('button', { name: 'Turn on' }).click();
	await expect(twoFactor.getByText('Two-step sign-in is on.')).toBeVisible();
	const recovery = (await twoFactor.locator('li code').first().textContent()) ?? '';
	expect(recovery).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);

	await page.goto('/admin/reports');
	await expect(page.getByText('Suspected AI')).toBeVisible();
	await page.getByRole('button', { name: 'Remove story' }).click();
	await expect(page.getByRole('heading', { name: 'All clear' })).toBeVisible();

	expect((await page.goto(storyUrl))?.status()).toBe(404);

	// Signing in again asks for a code; a recovery code works once in its place.
	await page.goto('/');
	await signOut(page);
	const token = await createLoginToken(db, 'admin@example.com');
	await page.goto(`/login/verify?token=${token}&next=/admin/reports`);
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page).toHaveURL(/\/login\/two-factor/);
	await page.getByRole('textbox', { name: 'Code' }).fill('000000');
	await page.getByRole('button', { name: 'Unlock' }).click();
	await expect(page.getByText(/That code didn’t work/)).toBeVisible();
	await page.getByRole('textbox', { name: 'Code' }).fill(recovery);
	await page.getByRole('button', { name: 'Unlock' }).click();
	await expect(page).toHaveURL(/\/admin\/reports$/);
});

test('admins approve prompts and they become the prompt of the day', async ({ page }) => {
	await signInAsStaff(page, 'admin@example.com');
	await page.goto('/admin/prompts');
	await page.getByRole('textbox', { name: 'Title' }).last().fill('The Last Train');
	await page
		.getByRole('textbox', { name: 'Prompt' })
		.last()
		.fill('Someone misses the last train home on purpose.');
	await page.getByRole('button', { name: 'Add prompt' }).click();

	await expect(page.getByText('Human', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Approve & schedule' }).first().click();
	await expect(page.getByRole('heading', { name: 'No prompts waiting' })).toBeVisible();

	await page.goto('/');
	await expect(page.getByText(/^Current challenge/)).toBeVisible();
	await expect(page.getByRole('link', { name: 'The Last Train' })).toBeVisible();
});

test('non-admins cannot reach the admin pages', async ({ page }) => {
	await signIn(page, 'erin@example.com');
	expect((await page.goto('/admin/reports'))?.status()).toBe(403);
	expect((await page.goto('/admin/prompts'))?.status()).toBe(403);
});

test('cron endpoints require the secret', async ({ request }) => {
	expect((await request.get('/api/cron/activity')).status()).toBe(401);
	const ok = await request.get('/api/cron/activity', {
		headers: { authorization: 'Bearer e2e-secret' }
	});
	expect(ok.status()).toBe(200);
	expect(await ok.json()).toMatchObject({ ok: true });
	expect((await request.get('/api/cron/prompts')).status()).toBe(401);
	// An earlier test approved a challenge, so it is still running and nothing is generated.
	const prompts = await request.get('/api/cron/prompts', {
		headers: { authorization: 'Bearer e2e-secret' }
	});
	expect(prompts.status()).toBe(200);
	expect(await prompts.json()).toMatchObject({ ok: true, action: 'open' });
});

test('pages send the CSP and security headers', async ({ request }) => {
	const res = await request.get('/');
	const headers = res.headers();
	// Only the site itself and the Google Analytics loader may run scripts, with a nonce.
	expect(headers['content-security-policy']).toContain(
		"script-src 'self' https://www.googletagmanager.com 'nonce-"
	);
	expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['permissions-policy']).toContain('camera=()');
});

test('a moderator can suspend a member, who is then signed out for good', async ({
	page,
	browser
}) => {
	const member = await browser.newPage();
	await signUp(member, 'frank@example.com', 'frank');

	await signInAsStaff(page, 'admin@example.com');
	await page.goto('/@frank');
	await page.getByRole('button', { name: 'Suspend member' }).click();
	await expect(page.getByRole('button', { name: 'Lift suspension' })).toBeVisible();

	// Frank's open session is gone, and a fresh sign-in link doesn't work.
	await member.goto('/settings');
	await expect(member).toHaveURL(/\/login/);
	const token = await createLoginToken(db, 'frank@example.com');
	await member.goto(`/login/verify?token=${token}`);
	await member.getByRole('button', { name: 'Continue' }).click();
	await expect(member).toHaveURL(/error=link/);

	await page.getByRole('button', { name: 'Lift suspension' }).click();
	await expect(page.getByRole('button', { name: 'Suspend member' })).toBeVisible();
	await signIn(member, 'frank@example.com');
	await member.close();
});

test('readers who hide mature stories cannot act on one they cannot see', async ({ page }) => {
	await signUp(page, 'gina@example.com', 'gina');
	await page.goto('/write');
	await page.getByRole('checkbox', { name: /mature/i }).check();
	await page.getByRole('checkbox', { name: 'I’m 18 or older' }).check();
	await writeStory(page, 'After Dark', 'A story for readers who opted in to mature stories.');
	const storyUrl = page.url();
	await signOut(page);

	await signUp(page, 'hal@example.com', 'hal');
	await page.goto(storyUrl);
	for (const action of ['bookmark', 'comment', 'rate']) {
		const response = await page.request.post(`${storyUrl}?/${action}`, {
			form: { body: 'Hello', score: '5' },
			headers: { origin: new URL(storyUrl).origin, accept: 'application/json' }
		});
		expect(response.status()).toBe(403);
		expect(await response.json()).toMatchObject({
			type: 'error',
			error: { message: expect.stringContaining('mature') }
		});
	}
});

test('a moderator marks a reported story mature, and it leaves the safe space', async ({
	page
}) => {
	await signUp(page, 'gail@example.com', 'gail');
	await page.goto('/write');
	await writeStory(page, 'Midnight Undressing', 'She let the robe fall to the floor.');
	const storyUrl = page.url();
	await signOut(page);

	await signUp(page, 'hank@example.com', 'hank');
	await page.goto(storyUrl);
	await page.getByRole('button', { name: 'Rate 3 out of 5' }).click();
	await expect(page.getByRole('button', { name: 'Rate 3 out of 5' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	// Straight after rating, while the page may still be starting up: the reason must stick.
	await page.getByText('Report', { exact: true }).click();
	await page.getByRole('combobox', { name: 'Reason' }).selectOption('mature');
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('combobox', { name: 'Reason' })).toHaveValue('mature');
	await page.getByRole('button', { name: 'Send report' }).click();
	await expect(page.getByText('A moderator will take a look.')).toBeVisible();
	// The rating shows in the reader's activity, and older activity has its own page.
	await page.goto('/desk');
	await expect(page.getByText(/You rated\s+Midnight Undressing\s+3 fish/)).toBeVisible();
	await page.getByRole('link', { name: 'All activity' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Your activity' })).toBeVisible();
	await expect(page.getByText(/You rated\s+Midnight Undressing\s+3 fish/)).toBeVisible();
	await signOut(page);

	await signInAsStaff(page, 'mona@example.com', 'mod');
	await page.goto('/admin/reports');
	await expect(page.getByText('Should be mature')).toBeVisible();
	await page.getByRole('button', { name: 'Mark mature' }).click();
	await expect(page.getByRole('heading', { name: 'All clear' })).toBeVisible();
	await page.goto('/admin/log');
	await expect(page.getByText('Marked mature')).toBeVisible();
	await signOut(page);

	// Visitors no longer see it in the feeds, and its text is withheld.
	await page.goto('/stories');
	await expect(page.getByRole('link', { name: 'Midnight Undressing' })).toHaveCount(0);
	await page.goto(storyUrl);
	await expect(page.getByText('She let the robe fall')).toHaveCount(0);

	// The author can't take the mark off.
	await signIn(page, 'gail@example.com');
	await page.goto(`/write?edit=${storyUrl.split('/').pop()}`);
	await expect(page.getByRole('checkbox', { name: 'Mature content' })).toBeDisabled();
	await expect(page.getByText('A moderator marked this story mature.')).toBeVisible();
});

test('authors confirm they’re 18 or older to post a mature story', async ({ page }) => {
	await signUp(page, 'ivy@example.com', 'ivy');
	await page.goto('/write');
	await page.getByRole('textbox', { name: 'Title' }).fill('After Hours');
	await page
		.getByRole('textbox', { name: 'Story' })
		.fill('The bar emptied out and the two of them stayed on, long past closing time, talking.');
	await page.getByRole('checkbox', { name: 'Mature content' }).check();
	await expect(page.getByRole('checkbox', { name: 'I’m 18 or older' })).toBeVisible();
	await page.getByRole('checkbox', { name: 'I’m 18 or older' }).check();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'After Hours' })).toBeVisible();
	await expect(page.getByText('Mature', { exact: true })).toBeVisible();
});
