import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import PromptComposer from './PromptComposer.svelte';

describe('PromptComposer', () => {
	it('offers generation and a human prompt form', async () => {
		const screen = await render(PromptComposer, { canGenerate: true });
		await expect.element(screen.getByRole('button', { name: 'Suggest prompts now' })).toBeEnabled();
		await expect.element(screen.getByText(/It never writes stories/)).toBeInTheDocument();
		const forms = screen.container.querySelectorAll('form');
		expect(forms[0].getAttribute('action')).toBe('?/generate');
		expect(forms[1].getAttribute('action')).toBe('?/create');
		await expectAccessible(screen.container);
	});

	it('disables generation without an API key', async () => {
		const screen = await render(PromptComposer, { canGenerate: false });
		await expect
			.element(screen.getByRole('button', { name: 'Suggest prompts now' }))
			.toBeDisabled();
		await expect.element(screen.getByText(/Set the BEDROCK_AWS_\* variables/)).toBeInTheDocument();
	});

	it('reports results and errors', async () => {
		const screen = await render(PromptComposer, {
			canGenerate: true,
			generated: 5,
			errors: { generate: 'Model declined.', title: 'Give it a title.' }
		});
		await expect.element(screen.getByText('Added 5 prompts for review.')).toBeInTheDocument();
		await expect.element(screen.getByRole('alert')).toHaveTextContent('Model declined.');
		await expect.element(screen.getByText('Give it a title.')).toBeInTheDocument();
	});
});
