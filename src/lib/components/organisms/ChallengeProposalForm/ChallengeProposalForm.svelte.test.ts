import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ChallengeProposalForm from './ChallengeProposalForm.svelte';

describe('ChallengeProposalForm', () => {
	it('asks for a title and prompt', async () => {
		const screen = await render(ChallengeProposalForm, {});
		await expect
			.element(screen.getByRole('heading', { name: 'Create a new challenge' }))
			.toBeInTheDocument();
		await expect.element(screen.getByRole('textbox', { name: 'Title' })).toBeRequired();
		await expect.element(screen.getByRole('textbox', { name: 'The challenge' })).toBeRequired();
		await expect.element(screen.getByRole('button', { name: 'suggest it!' })).toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('shows success, errors, and kept values', async () => {
		const screen = await render(ChallengeProposalForm, {
			values: { title: 'Fog', promptText: '' },
			errors: { promptText: 'Write the prompt.', form: 'Too many waiting.' },
			proposed: true
		});
		await expect.element(screen.getByText(/waiting for review/)).toBeInTheDocument();
		await expect.element(screen.getByText('Too many waiting.')).toBeInTheDocument();
		await expect.element(screen.getByText('Write the prompt.')).toBeInTheDocument();
		await expect.element(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Fog');
	});
});
