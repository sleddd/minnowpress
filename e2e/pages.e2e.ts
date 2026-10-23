import { expect, test } from '@playwright/test';
import { signIn, signInAsStaff, signUp, writeStory } from './helpers';

test('home shows the welcome, explainer, and story columns', async ({ page }) => {
	await signUp(page, 'uma@example.com', 'uma');
	await page.goto('/write');
	await writeStory(page, 'Harbor Lights', 'The boats came home one by one.', { tags: 'harbor' });

	await page.goto('/');
	await expect(
		page.getByRole('heading', { level: 1, name: 'Small stories swim in schools.' })
	).toBeVisible();
	await expect(
		page.getByRole('complementary', { name: 'How prequels and sequels work' })
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Recent' }).getByRole('link', { name: 'Harbor Lights' })
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Tags' }).getByRole('link', { name: 'harbor' })
	).toBeVisible();
	await expect(page.getByRole('region', { name: 'Past challenges' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Active' })).toHaveCount(0);
	await page.getByRole('link', { name: 'More recent' }).click();
	await expect(page).toHaveURL(/\/stories$/);
	await expect(
		page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'browse' })
	).toHaveAttribute('aria-current', 'page');
});

test('search finds stories, authors, and tags', async ({ page }) => {
	await signUp(page, 'vic@example.com', 'vic');
	await page.goto('/write');
	await writeStory(page, 'The Owl Parliament', 'Every owl had an opinion.', { tags: 'owls' });

	await page.goto('/');
	await page.getByRole('searchbox', { name: 'Search' }).first().fill('owl');
	await page.getByRole('searchbox', { name: 'Search' }).first().press('Enter');
	await expect(page).toHaveURL(/\/search\?q=owl/);
	await expect(page.getByRole('heading', { name: 'Results for “owl”' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'The Owl Parliament' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'owls' })).toBeVisible();

	await page.goto('/search?q=Vic');
	await expect(
		page.locator('#main').getByRole('link', { name: 'Vic', exact: true })
	).toHaveAttribute('href', '/@vic');

	await page.goto('/search?q=x');
	await expect(page.getByText(/at least two characters/)).toBeVisible();
});

test('authors and tags directories', async ({ page }) => {
	await signIn(page, 'vic@example.com');
	await page.goto('/authors');
	await expect(page.getByRole('heading', { level: 1, name: 'Authors' })).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Writing here' }).getByRole('link', { name: 'Vic' })
	).toBeVisible();
	await expect(page.getByText(/^\d+ writers?$/)).toBeVisible();

	await page.goto('/tags');
	await expect(page.getByRole('heading', { level: 1, name: 'Tags' })).toBeVisible();
	await page.getByRole('link', { name: /^owls \d+$/ }).click();
	await expect(page).toHaveURL(/\/tags\/owls$/);
	await expect(page.getByRole('link', { name: 'The Owl Parliament' })).toBeVisible();
});

test('admins write blog posts that readers can read', async ({ page }) => {
	await signInAsStaff(page, 'admin@example.com');
	await page.goto('/admin/blog');
	await page.getByRole('link', { name: 'New post' }).click();
	await page.getByRole('textbox', { name: 'Title' }).fill('We are back');
	await page
		.getByRole('textbox', { name: 'Post' })
		.fill('Ficly lives on.\n\nWrite something today.');
	await page.getByRole('button', { name: 'Save draft' }).click();
	await expect(page.getByText('Saved.')).toBeVisible();

	await page.goto('/blog');
	await expect(page.getByRole('link', { name: 'We are back' })).toHaveCount(0);

	await page.goto('/admin/blog');
	await page.getByRole('link', { name: 'We are back' }).click();
	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByText(/Published at \/blog\/we-are-back/)).toBeVisible();

	await page.goto('/blog');
	await page.getByRole('link', { name: 'We are back' }).click();
	await expect(page).toHaveURL(/\/blog\/we-are-back$/);
	await expect(page.getByRole('heading', { level: 1, name: 'We are back' })).toBeVisible();
	await expect(page.getByText('Write something today.')).toBeVisible();
});

test('non-admins cannot manage the blog', async ({ page }) => {
	await signIn(page, 'vic@example.com');
	expect((await page.goto('/admin/blog'))?.status()).toBe(403);
	expect((await page.goto('/admin/blog/new'))?.status()).toBe(403);
});

test('mobile: the menu, account links, and continue links fit the screen', async ({ browser }) => {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	await page.goto('/stories', { waitUntil: 'networkidle' });
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	// On phones the sections and account links fold into the ribbon's menu.
	await expect(page.getByRole('navigation', { name: 'Account' })).toBeHidden();
	await page.getByLabel('Menu').click();
	await expect(page.locator('.menu-links').getByRole('link', { name: /tags/ })).toBeVisible();
	await expect(page.locator('details.menu').getByRole('link', { name: 'Sign in' })).toBeVisible();
	await page
		.locator('.menu-links')
		.getByRole('link', { name: /browse/ })
		.click();
	await expect(page).toHaveURL(/\/browse$/);
	await expect(page.locator('details.menu')).not.toHaveAttribute('open', '');
	await page.goto('/stories', { waitUntil: 'networkidle' });

	await page.getByRole('link', { name: 'Harbor Lights' }).click();
	await expect(page.getByRole('link', { name: 'Write a sequel' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Write a prequel' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
	await page.close();
});

test('desk, browse, help, and proposing a challenge', async ({ page }) => {
	await signUp(page, 'wren@example.com', 'wren');
	await page
		.getByRole('navigation', { name: 'Main' })
		.getByRole('link', { name: 'your stories' })
		.click();
	await expect(page).toHaveURL(/\/desk$/);
	await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
	const desk = page.getByRole('navigation', { name: 'Your Desk' });
	await expect(desk.getByRole('link', { name: 'Drafts (0)' })).toBeVisible();

	await desk.getByRole('link', { name: 'Create a new challenge' }).click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Low tide');
	await page.getByRole('textbox', { name: 'The challenge' }).fill('Something the sea gave back.');
	await page.getByRole('button', { name: 'suggest it!' }).click();
	await expect(page.getByText(/waiting for review/)).toBeVisible();

	await page.goto('/browse');
	await expect(page.getByRole('heading', { level: 1, name: 'Browse Stories' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Popular' })).toBeVisible();

	await page
		.getByRole('navigation', { name: 'Account' })
		.getByRole('link', { name: 'Help' })
		.click();
	await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();
});

test('members pick light, dark, or automatic theme in settings', async ({ page }) => {
	await signUp(page, 'theo@example.com', 'theo');
	await page.goto('/settings', { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(page.getByRole('radio', { name: /Light/ })).toBeChecked();
	await page.getByRole('radio', { name: /Dark/ }).check();
	await page.getByRole('button', { name: 'Save theme' }).click();
	await expect(page.getByText('Theme saved.')).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	// It sticks to the account on every page.
	await page.goto('/tags');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.goto('/settings', { waitUntil: 'networkidle' });
	await page.getByRole('radio', { name: /Auto/ }).check();
	await page.getByRole('button', { name: 'Save theme' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', '');
});

test('saving the profile keeps every field', async ({ page }) => {
	await signUp(page, 'pia@example.com', 'pia');
	await page.goto('/settings', { waitUntil: 'networkidle' });
	await page.getByRole('textbox', { name: 'Bio' }).fill('I write about tides.');
	await page.getByRole('button', { name: 'Save profile' }).click();
	await expect(page.getByText('Profile saved.')).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Bio' })).toHaveValue('I write about tides.');

	// A second save of a different field must not undo the first.
	await page.getByRole('checkbox', { name: 'Show mature stories' }).check();
	await page.getByRole('button', { name: 'Save profile' }).click();
	await expect(page.getByText('Profile saved.')).toBeVisible();
	await page.goto('/settings', { waitUntil: 'networkidle' });
	await expect(page.getByRole('textbox', { name: 'Bio' })).toHaveValue('I write about tides.');
	await expect(page.getByRole('checkbox', { name: 'Show mature stories' })).toBeChecked();

	await page.getByRole('textbox', { name: 'Bio' }).fill('Tides and fog.');
	await page.getByRole('button', { name: 'Save profile' }).click();
	await expect(page.getByText('Profile saved.')).toBeVisible();
	await page.goto('/settings', { waitUntil: 'networkidle' });
	await expect(page.getByRole('textbox', { name: 'Bio' })).toHaveValue('Tides and fog.');
	await expect(page.getByRole('checkbox', { name: 'Show mature stories' })).toBeChecked();
});

test('settings lists where you are signed in and can sign out other devices', async ({
	browser
}) => {
	const laptop = await browser.newPage();
	await signUp(laptop, 'devi@example.com', 'devi');
	const phone = await browser.newPage();
	await signIn(phone, 'devi@example.com');

	await laptop.goto('/settings', { waitUntil: 'networkidle' });
	const list = laptop.getByRole('region', { name: 'Where you’re signed in' });
	await expect(list.getByText('This device')).toHaveCount(1);
	await expect(list.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(1);
	await list.getByRole('button', { name: 'Sign out everywhere else' }).click();
	await expect(laptop.getByText('Signed out.')).toBeVisible();

	// The other device is signed out; this one isn't.
	await phone.goto('/settings');
	await expect(phone).toHaveURL(/\/login/);
	await laptop.goto('/settings');
	await expect(laptop).toHaveURL(/\/settings/);
	await laptop.close();
	await phone.close();
});
