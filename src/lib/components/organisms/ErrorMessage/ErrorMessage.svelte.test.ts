import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ErrorMessage from './ErrorMessage.svelte';

describe('ErrorMessage', () => {
	it('explains a 404', async () => {
		const screen = await render(ErrorMessage, { status: 404, message: 'Not Found' });
		await expect
			.element(screen.getByRole('heading', { name: 'Page not found' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Error 404')).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Back to stories' }))
			.toHaveAttribute('href', '/');
		await expectAccessible(screen.container);
	});

	it('titles 403s and other errors, showing distinct messages', async () => {
		const forbidden = await render(ErrorMessage, { status: 403, message: 'Admins only' });
		await expect
			.element(forbidden.getByRole('heading', { name: 'Not allowed' }))
			.toBeInTheDocument();
		await expect.element(forbidden.getByText('Admins only')).toBeInTheDocument();
		await forbidden.unmount();
		const other = await render(ErrorMessage, { status: 500, message: 'Something went wrong' });
		await expect
			.element(other.getByRole('heading', { name: 'Something went wrong' }))
			.toBeInTheDocument();
		expect(other.container.querySelectorAll('p')).toHaveLength(1);
	});
});
