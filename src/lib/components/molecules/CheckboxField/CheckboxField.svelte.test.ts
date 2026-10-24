import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import CheckboxField from './CheckboxField.svelte';

describe('CheckboxField', () => {
	it('labels the checkbox and describes it with the hint', async () => {
		const screen = await render(CheckboxField, {
			id: 'mature',
			name: 'isMature',
			label: 'Mature content',
			hint: 'Hidden unless readers opt in.'
		});
		const box = screen.getByRole('checkbox', { name: 'Mature content' });
		await expect.element(box).toHaveAttribute('aria-describedby', 'mature-hint');
		await expect.element(box).not.toBeChecked();
		await screen.getByText('Mature content').click();
		await expect.element(box).toBeChecked();
		await expectAccessible(screen.container);
	});

	it('can start checked without a hint', async () => {
		const screen = await render(CheckboxField, { id: 'm', name: 'm', label: 'M', checked: true });
		const box = screen.getByRole('checkbox');
		await expect.element(box).toBeChecked();
		await expect.element(box).not.toHaveAttribute('aria-describedby');
	});

	it('can be required, disabled, and show an error', async () => {
		const screen = await render(CheckboxField, {
			id: 'adult',
			name: 'adult',
			label: 'I’m 18 or older',
			hint: 'Adults only.',
			required: true,
			error: 'Confirm you’re 18 or older.'
		});
		const box = screen.getByRole('checkbox', { name: 'I’m 18 or older' });
		await expect.element(box).toBeRequired();
		await expect.element(box).toHaveAttribute('aria-invalid', 'true');
		await expect.element(box).toHaveAttribute('aria-describedby', 'adult-hint adult-error');
		await expect.element(screen.getByText('Confirm you’re 18 or older.')).toBeInTheDocument();
		await expectAccessible(screen.container);

		const locked = await render(CheckboxField, {
			id: 'm2',
			name: 'm2',
			label: 'Locked',
			checked: true,
			disabled: true
		});
		await expect.element(locked.getByRole('checkbox', { name: 'Locked' })).toBeDisabled();
	});

	it('has a larger size for settings', async () => {
		const screen = await render(CheckboxField, {
			id: 'big',
			name: 'big',
			label: 'Big',
			size: 'md'
		});
		const label = screen.container.querySelector('label')!;
		const small = await render(CheckboxField, { id: 'small', name: 'small', label: 'Small' });
		const smallLabel = small.container.querySelector('label')!;
		expect(parseFloat(getComputedStyle(label).fontSize)).toBeGreaterThan(
			parseFloat(getComputedStyle(smallLabel).fontSize)
		);
	});
});
