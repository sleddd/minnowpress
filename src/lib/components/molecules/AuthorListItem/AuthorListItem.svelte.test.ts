import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import AuthorListItem from './AuthorListItem.svelte';

describe('AuthorListItem', () => {
	it('links to the author with a story count', async () => {
		const screen = await render(AuthorListItem, {
			author: { name: 'Henjo', href: '/@henjo', stories: 87, avatarUrl: null, archive: false }
		});
		await expect
			.element(screen.getByRole('link', { name: 'Henjo' }))
			.toHaveAttribute('href', '/@henjo');
		await expect.element(screen.getByText('87 stories')).toBeInTheDocument();
		expect(screen.container.querySelector('svg.avatar.round')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('marks archive authors and shows avatars when present', async () => {
		const screen = await render(AuthorListItem, {
			author: {
				name: 'THX 0477',
				href: '/authors/ficly/thx-0477',
				stories: 1,
				avatarUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
				archive: true
			}
		});
		await expect.element(screen.getByText('1 story · Ficly archive')).toBeInTheDocument();
		expect(screen.container.querySelector('img')).not.toBeNull();
	});
});
