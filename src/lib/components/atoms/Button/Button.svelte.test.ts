import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Button from './Button.svelte';

describe('Button', () => {
	it('renders its label as a type=button by default', async () => {
		const screen = await render(Button, { children: text('Save') });
		const button = screen.getByRole('button', { name: 'Save' });
		await expect.element(button).toHaveAttribute('type', 'button');
		await expect.element(button).toHaveClass('primary');
	});

	it('applies variant, size, and type', async () => {
		const screen = await render(Button, {
			variant: 'danger',
			size: 'sm',
			type: 'submit',
			children: text('Delete')
		});
		const button = screen.getByRole('button');
		await expect.element(button).toHaveClass('danger');
		await expect.element(button).toHaveClass('sm');
		await expect.element(button).toHaveAttribute('type', 'submit');
	});

	it('calls onclick', async () => {
		const onclick = vi.fn();
		const screen = await render(Button, { onclick, children: text('Go') });
		await screen.getByRole('button').click();
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('can be disabled', async () => {
		const screen = await render(Button, { disabled: true, children: text('Go') });
		await expect.element(screen.getByRole('button')).toBeDisabled();
	});

	it('passes through form attributes', async () => {
		const screen = await render(Button, {
			name: 'intent',
			value: 'publish',
			children: text('Publish')
		});
		await expect.element(screen.getByRole('button')).toHaveAttribute('value', 'publish');
	});

	it('updates its variant and size', async () => {
		const screen = await render(Button, { variant: 'primary', size: 'md', children: text('Go') });
		await screen.rerender({ variant: 'secondary', size: 'sm' });
		await expect.element(screen.getByRole('button')).toHaveClass('secondary');
		await expect.element(screen.getByRole('button')).toHaveClass('sm');
	});

	it('supports the call-to-action variant and full width', async () => {
		const screen = await render(Button, {
			variant: 'cta',
			block: true,
			children: text('Write a story')
		});
		const button = screen.getByRole('button');
		await expect.element(button).toHaveClass('cta');
		await expect.element(button).toHaveClass('block');
	});
});
