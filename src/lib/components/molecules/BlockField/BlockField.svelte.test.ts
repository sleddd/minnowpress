import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import BlockField from './BlockField.svelte';

describe('BlockField', () => {
	it('labels the input with a block label and a hint', async () => {
		const screen = await render(BlockField, {
			id: 'tags',
			name: 'tags',
			label: 'Tags',
			value: 'sea',
			hint: 'Separate your tags with commas.'
		});
		const input = screen.getByRole('textbox', { name: 'Tags' });
		await expect.element(input).toHaveValue('sea');
		await expect.element(input).toHaveAttribute('aria-describedby', 'tags-hint');
		await expectAccessible(screen.container);
	});

	it('shows an error and marks the field invalid', async () => {
		const screen = await render(BlockField, {
			id: 'title',
			name: 'title',
			label: 'Title',
			error: 'Give it a title.',
			required: true
		});
		await expect.element(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
		await expect.element(screen.getByRole('textbox')).toBeRequired();
		await expect.element(screen.getByText('Give it a title.')).toBeInTheDocument();
		expect(screen.container.querySelector('.row.invalid')).not.toBeNull();
	});

	it('has a large italic size for titles and passes a placeholder', async () => {
		const screen = await render(BlockField, {
			id: 'title',
			name: 'title',
			label: 'Title',
			size: 'lg',
			placeholder: 'Untitled'
		});
		await expect
			.element(screen.getByRole('textbox', { name: 'Title' }))
			.toHaveAttribute('placeholder', 'Untitled');
		expect(screen.container.querySelector('.field.lg')).not.toBeNull();
	});
});
