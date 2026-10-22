import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import EditorLayout from './EditorLayout.svelte';

describe('EditorLayout', () => {
	it('renders the editor with an aside landmark', async () => {
		const screen = await render(EditorLayout, { children: text('Editor'), aside: text('Prompt') });
		await expect.element(screen.getByRole('complementary')).toHaveTextContent('Prompt');
		expect(screen.container.querySelector('.with-aside')).not.toBeNull();
	});

	it('renders a single column without an aside', async () => {
		const screen = await render(EditorLayout, { children: text('Editor') });
		await expect.element(screen.getByRole('complementary')).not.toBeInTheDocument();
		expect(screen.container.querySelector('.with-aside')).toBeNull();
	});
});
