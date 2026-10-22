import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import SearchForm from './SearchForm.svelte';

describe('SearchForm', () => {
	it('is a GET search landmark that sends q to /search', async () => {
		const screen = await render(SearchForm, { value: 'ducks' });
		await expect.element(screen.getByRole('search')).toBeInTheDocument();
		const input = screen.getByRole('searchbox', { name: 'Search' });
		await expect.element(input).toHaveValue('ducks');
		await expect.element(input).toHaveAttribute('name', 'q');
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('action')).toBe('/search');
		expect(form.getAttribute('method')).toBe('GET');
		await expectAccessible(screen.container);
	});

	it('has a visible search button', async () => {
		const screen = await render(SearchForm, {});
		await expect
			.element(screen.getByRole('button', { name: 'search' }))
			.toHaveAttribute('type', 'submit');
	});

	it('takes a custom id and placeholder', async () => {
		const screen = await render(SearchForm, { id: 'menu-search', placeholder: 'Search…' });
		await expect.element(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Search…');
		expect(screen.container.querySelector('#menu-search')).not.toBeNull();
	});
});
