import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { text } from '../../testing/helpers';
import Label from './Label.svelte';

describe('Label', () => {
	it('renders a label for an input id', async () => {
		const screen = await render(Label, { for: 'title', children: text('Title') });
		const label = screen.getByText('Title');
		await expect.element(label).toBeInTheDocument();
		expect(screen.container.querySelector('label')?.getAttribute('for')).toBe('title');
	});

	it('marks optional fields', async () => {
		const screen = await render(Label, { for: 'bio', optional: true, children: text('Bio') });
		expect(screen.container.querySelector('label')?.dataset.optional).toBe('optional');
	});
});
