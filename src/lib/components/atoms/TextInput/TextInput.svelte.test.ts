import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TextInput from './TextInput.svelte';

describe('TextInput', () => {
	it('renders a text input with a value', async () => {
		const screen = await render(TextInput, {
			name: 'title',
			value: 'Hello',
			'aria-label': 'Title'
		});
		const input = screen.getByRole('textbox', { name: 'Title' });
		await expect.element(input).toHaveValue('Hello');
		await expect.element(input).toHaveAttribute('type', 'text');
		await expect.element(input).toHaveAttribute('name', 'title');
	});

	it('accepts typing', async () => {
		const screen = await render(TextInput, { 'aria-label': 'Title' });
		const input = screen.getByRole('textbox');
		await input.fill('A story');
		await expect.element(input).toHaveValue('A story');
	});

	it('marks itself invalid', async () => {
		const screen = await render(TextInput, { invalid: true, 'aria-label': 'Title' });
		await expect.element(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
	});

	it('omits aria-invalid when valid and supports other types', async () => {
		const screen = await render(TextInput, { type: 'email', 'aria-label': 'Email' });
		const input = screen.getByRole('textbox');
		await expect.element(input).not.toHaveAttribute('aria-invalid');
		await expect.element(input).toHaveAttribute('type', 'email');
	});
});
