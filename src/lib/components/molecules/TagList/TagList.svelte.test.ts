import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import TagList from './TagList.svelte';

describe('TagList', () => {
	it('lists tag links', async () => {
		const screen = await render(TagList, { tags: ['ghost', 'sea'] });
		await expect.element(screen.getByRole('list', { name: 'Tags' })).toBeInTheDocument();
		expect(screen.container.querySelectorAll('li')).toHaveLength(2);
		await expect.element(screen.getByRole('link', { name: 'sea' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('renders nothing without tags', async () => {
		const screen = await render(TagList, { tags: [] });
		expect(screen.container.querySelector('ul')).toBeNull();
	});
});
