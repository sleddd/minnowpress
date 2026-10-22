import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FieldError from './FieldError.svelte';

describe('FieldError', () => {
	it('shows the message with its id', async () => {
		const screen = await render(FieldError, { id: 'title-error', message: 'Give it a title.' });
		await expect.element(screen.getByText('Give it a title.')).toHaveAttribute('id', 'title-error');
	});

	it('renders nothing without a message', async () => {
		const screen = await render(FieldError, { id: 'x', message: undefined });
		expect(screen.container.querySelector('p')).toBeNull();
	});
});
