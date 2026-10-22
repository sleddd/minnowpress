import type { Page } from '@playwright/test';
import { createLoginToken } from '../src/lib/server/auth.ts';
import { createDb } from '../src/lib/server/db/client.ts';

export const db = createDb('file:e2e.db');

/**
 * Signs in through the real magic-link verify page. Emails are only printed to the dev
 * server console, so the test issues the token directly instead of reading an inbox.
 */
export async function signIn(page: Page, email: string) {
	const token = await createLoginToken(db, email);
	await page.goto(`/login/verify?token=${token}`);
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** First sign-in lands on the welcome profile form; pick a username there. */
export async function signUp(page: Page, email: string, username: string) {
	await signIn(page, email);
	await page.getByRole('textbox', { name: 'Username' }).fill(username);
	await page
		.getByRole('textbox', { name: 'Display name' })
		.fill(username[0].toUpperCase() + username.slice(1));
	await page.getByRole('button', { name: 'Save profile' }).click();
	await page.getByText('Profile saved.').waitFor();
}

export async function signOut(page: Page) {
	await page.getByRole('button', { name: 'Sign out' }).click();
	await page.getByRole('link', { name: 'Sign in' }).waitFor();
}

/** Stories need 60 characters; short test bodies get a harmless tail. */
export function atLeastMinimum(body: string) {
	return body.length >= 60
		? body
		: `${body} And the tide kept coming in, as it always had, all night.`;
}

export async function writeStory(
	page: Page,
	title: string,
	body: string,
	opts: { tags?: string } = {}
) {
	await page.getByRole('textbox', { name: 'Title' }).fill(title);
	await page.getByRole('textbox', { name: 'Story' }).fill(atLeastMinimum(body));
	if (opts.tags) await page.getByRole('textbox', { name: /Tags/ }).fill(opts.tags);
	await page.getByRole('button', { name: 'Publish' }).click();
	await page.getByRole('heading', { level: 1, name: title }).waitFor();
}
