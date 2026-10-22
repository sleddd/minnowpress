import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import FormField from './FormField.svelte';

describe('FormField', () => {
	it('labels a text input', async () => {
		const screen = await render(FormField, {
			id: 'title',
			name: 'title',
			label: 'Title',
			value: 'Fog'
		});
		const input = screen.getByRole('textbox', { name: 'Title' });
		await expect.element(input).toHaveValue('Fog');
		await expect.element(input).toHaveAttribute('name', 'title');
		await expectAccessible(screen.container);
	});

	it('links the hint and error to the input', async () => {
		const screen = await render(FormField, {
			id: 'title',
			name: 'title',
			label: 'Title',
			hint: 'Short and sweet.',
			error: 'Give it a title.'
		});
		const input = screen.getByRole('textbox');
		await expect.element(input).toHaveAttribute('aria-describedby', 'title-hint title-error');
		await expect.element(input).toHaveAttribute('aria-invalid', 'true');
		await expect.element(screen.getByText('Give it a title.')).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('renders a textarea', async () => {
		const screen = await render(FormField, {
			id: 'bio',
			name: 'bio',
			label: 'Bio',
			type: 'textarea',
			rows: 3,
			optional: true
		});
		const area = screen.getByRole('textbox', { name: /Bio/ });
		await expect.element(area).toHaveAttribute('rows', '3');
		expect(screen.container.querySelector('textarea')).not.toBeNull();
		await expectAccessible(screen.container);
	});

	it('supports other input types and passes attributes through', async () => {
		const screen = await render(FormField, {
			id: 'email',
			name: 'email',
			label: 'Email',
			type: 'email',
			required: true,
			autocomplete: 'email'
		});
		const input = screen.getByRole('textbox', { name: 'Email' });
		await expect.element(input).toHaveAttribute('type', 'email');
		await expect.element(input).toBeRequired();
		await expect.element(input).not.toHaveAttribute('aria-describedby');
	});
});
