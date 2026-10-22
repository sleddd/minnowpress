import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import SelectField from './SelectField.svelte';

const options = [
	{ value: 'ai_generated', label: 'Suspected AI-generated' },
	{ value: 'spam', label: 'Spam' }
];

describe('SelectField', () => {
	it('labels the select', async () => {
		const screen = await render(SelectField, {
			id: 'reason',
			name: 'reason',
			label: 'Reason',
			options
		});
		const select = screen.getByRole('combobox', { name: 'Reason' });
		await expect.element(select).toHaveValue('ai_generated');
		await expectAccessible(screen.container);
	});

	it('shows an error', async () => {
		const screen = await render(SelectField, {
			id: 'reason',
			name: 'reason',
			label: 'Reason',
			options,
			error: 'Pick one.'
		});
		await expect
			.element(screen.getByRole('combobox'))
			.toHaveAttribute('aria-describedby', 'reason-error');
		await expect.element(screen.getByText('Pick one.')).toBeInTheDocument();
	});
});
