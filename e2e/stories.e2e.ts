import { expect, test } from '@playwright/test';
import { atLeastMinimum, signIn, signOut, signUp, writeStory } from './helpers';

test('sign-in form sends a magic link', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('textbox', { name: 'Email' }).fill('someone@example.com');
	await page.getByRole('button', { name: 'Email me a link' }).click();
	await expect(page.getByRole('status')).toContainText('someone@example.com');
});

test('a bad sign-in link is rejected', async ({ page }) => {
	await page.goto('/login/verify?token=nope');
	await page.getByRole('button', { name: 'Continue' }).click();
	await expect(page.getByRole('alert')).toContainText('invalid or has expired');
});

test('write, continue, comment, rate, and follow', async ({ page }) => {
	// Alice writes a story.
	await signUp(page, 'alice@example.com', 'alice');
	await page.goto('/write');
	await expect(page.getByRole('status')).toHaveText(/0 \/ 1024/);
	await expect(page.getByText('(60 character minimum not yet met)')).toBeVisible();
	await writeStory(page, 'The Lighthouse', 'The keeper had not seen a ship in forty years.', {
		tags: 'Sea, ghosts'
	});
	await expect(page.getByRole('link', { name: 'sea' })).toBeVisible();
	const storyUrl = page.url();
	await signOut(page);

	// Bob writes a sequel to it.
	await signUp(page, 'bob@example.com', 'bob');
	await page.goto(storyUrl);
	await page.getByRole('link', { name: 'Write a sequel' }).click();
	await expect(page.getByRole('heading', { name: 'Write a sequel' })).toBeVisible();
	await writeStory(page, 'The Ship', 'Then, one foggy night, a light answered his.');
	await expect(
		page.getByRole('region', { name: 'Prequels' }).getByRole('link', { name: 'The Lighthouse' })
	).toBeVisible();

	// The chain shows both.
	await page.getByRole('link', { name: 'See the whole chain' }).click();
	await expect(page.getByRole('navigation', { name: 'Story chain' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'The Lighthouse' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'The Ship' })).toBeVisible();

	// Bob rates and comments on Alice's story, then follows her.
	await page.goto(storyUrl);
	await page.getByRole('button', { name: 'Rate 4 out of 5' }).click();
	await expect(page.getByRole('button', { name: 'Rate 4 out of 5' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(page.getByRole('img', { name: 'Rated 4 out of 5' })).toBeVisible();
	await page.getByRole('textbox', { name: 'Add a comment' }).fill('Chills.');
	await page.getByRole('button', { name: 'Comment' }).click();
	await expect(page.getByText('Chills.')).toBeVisible();

	await page.getByRole('link', { name: 'Alice' }).first().click();
	await page.getByRole('button', { name: 'Follow' }).click();
	await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();

	// Alice shows up on Bob's desk, with her story.
	await page.goto('/desk');
	await expect(
		page
			.getByRole('region', { name: 'People you follow' })
			.getByRole('link', { name: /Alice/ })
			.first()
	).toBeVisible();
	await expect(
		page
			.getByRole('region', { name: 'From people you follow' })
			.getByRole('link', { name: 'The Lighthouse' })
	).toBeVisible();

	// Alice's story appears in Bob's Following feed.
	await page.goto('/stories?tab=following');
	await expect(page.getByRole('link', { name: 'The Lighthouse' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'The Ship' })).toHaveCount(0);
});

test('drafts are private until published', async ({ page, browser }) => {
	await signUp(page, 'carol@example.com', 'carol');
	await page.goto('/write');
	await page.getByRole('textbox', { name: 'Title' }).fill('Unfinished');
	await page.getByRole('textbox', { name: 'Story' }).fill(atLeastMinimum('Not ready yet.'));
	await page.getByRole('checkbox', { name: 'Save as a draft' }).check();
	await page.getByRole('button', { name: 'save draft' }).click();
	await expect(page.getByText('This is a draft. Only you can see it.')).toBeVisible();
	const draftUrl = page.url();

	const stranger = await browser.newPage();
	expect((await stranger.goto(draftUrl))?.status()).toBe(404);

	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByText('This is a draft.')).toHaveCount(0);
	expect((await stranger.goto(draftUrl))?.status()).toBe(200);
	await stranger.close();
});

test('the editor rejects stories over 1024 characters', async ({ page }) => {
	await signIn(page, 'alice@example.com');
	await page.goto('/write');
	await page.getByRole('textbox', { name: 'Story' }).fill('a'.repeat(1025));
	await expect(page.getByRole('button', { name: 'Publish' })).toBeDisabled();
	await expect(page.getByRole('status')).toContainText('1 over');
});

test('authors can edit their published stories', async ({ page }) => {
	await signUp(page, 'edie@example.com', 'edie');
	await page.goto('/write');
	await writeStory(page, 'First Draft of Fog', 'The fog came in over the harbor before dawn.');
	await page.getByRole('link', { name: 'Edit story' }).click();
	await expect(page.getByRole('heading', { name: 'Edit story' })).toBeVisible();
	await expect(page.getByRole('checkbox', { name: 'Save as a draft' })).toHaveCount(0);
	await page.getByRole('textbox', { name: 'Title' }).fill('Fog, Revised');
	await page.getByRole('button', { name: 'update!' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Fog, Revised' })).toBeVisible();
	await expect(page.getByText(/Edited on/)).toBeVisible();
});

test('authors can delete their published stories', async ({ page }) => {
	await signUp(page, 'dell@example.com', 'dell');
	await page.goto('/write');
	await writeStory(
		page,
		'Gone Tomorrow',
		'This story will not be here for long, and that is fine.'
	);
	const url = page.url();
	await page.getByText('Delete this story').click();
	await page.getByRole('button', { name: 'Delete for good' }).click();
	await expect(page).toHaveURL(/\/@dell$/);
	expect((await page.goto(url))?.status()).toBe(404);
});
