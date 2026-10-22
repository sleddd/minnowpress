import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Select from './Select.svelte';

const options = [
	{ value: 'spam', label: 'Spam' },
	{ value: 'ai_generated', label: 'Suspected AI-generated' }
];

describe('Select', () => {
	it('renders options and defaults to the first', async () => {
		const screen = await render(Select, { options, 'aria-label': 'Reason' });
		const select = screen.getByRole('combobox', { name: 'Reason' });
		await expect.element(select).toHaveValue('spam');
		expect(screen.container.querySelectorAll('option')).toHaveLength(2);
	});

	it('honours a given value and changes on selection', async () => {
		const screen = await render(Select, { options, value: 'ai_generated', 'aria-label': 'Reason' });
		const select = screen.getByRole('combobox');
		await expect.element(select).toHaveValue('ai_generated');
		await select.selectOptions('spam');
		await expect.element(select).toHaveValue('spam');
	});
});
