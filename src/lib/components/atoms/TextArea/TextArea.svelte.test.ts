import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TextArea from './TextArea.svelte';

describe('TextArea', () => {
	it('renders with a value and default rows', async () => {
		const screen = await render(TextArea, { value: 'Once', 'aria-label': 'Body' });
		const area = screen.getByRole('textbox', { name: 'Body' });
		await expect.element(area).toHaveValue('Once');
		await expect.element(area).toHaveAttribute('rows', '4');
	});

	it('accepts typing', async () => {
		const screen = await render(TextArea, { 'aria-label': 'Body' });
		await screen.getByRole('textbox').fill('upon a time');
		await expect.element(screen.getByRole('textbox')).toHaveValue('upon a time');
	});

	it('supports the prose style and invalid state', async () => {
		const screen = await render(TextArea, {
			prose: true,
			invalid: true,
			rows: 12,
			'aria-label': 'Body'
		});
		const area = screen.getByRole('textbox');
		await expect.element(area).toHaveClass('prose');
		await expect.element(area).toHaveAttribute('aria-invalid', 'true');
		await expect.element(area).toHaveAttribute('rows', '12');
	});
});
