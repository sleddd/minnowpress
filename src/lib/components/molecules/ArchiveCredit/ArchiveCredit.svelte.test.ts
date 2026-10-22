import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import ArchiveCredit from './ArchiveCredit.svelte';

const credit = {
	url: 'https://ficly.com/stories/1/',
	author: 'Kevin',
	authorUrl: 'https://ficly.com/authors/kevin/'
};

describe('ArchiveCredit', () => {
	it('credits the original author on Ficly', async () => {
		const screen = await render(ArchiveCredit, { credit });
		await expect
			.element(screen.getByRole('link', { name: 'Kevin' }))
			.toHaveAttribute('href', credit.authorUrl);
		await expect.element(screen.getByText(/on Ficly/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Read the original' }))
			.not.toBeInTheDocument();
		await expectAccessible(screen.container);
	});

	it('adds the license and original link in full mode', async () => {
		const screen = await render(ArchiveCredit, { credit, variant: 'full' });
		await expect
			.element(screen.getByRole('link', { name: 'CC BY-SA 3.0' }))
			.toHaveAttribute('rel', 'license noopener');
		await expect
			.element(screen.getByRole('link', { name: 'Read the original' }))
			.toHaveAttribute('href', credit.url);
	});

	it('shows the name without a link when there is no author page', async () => {
		const screen = await render(ArchiveCredit, { credit: { ...credit, authorUrl: null } });
		await expect.element(screen.getByText(/Kevin/)).toBeInTheDocument();
		expect(screen.container.querySelectorAll('a')).toHaveLength(0);
	});

	it('omits the author in license mode', async () => {
		const screen = await render(ArchiveCredit, { credit, variant: 'license' });
		await expect.element(screen.getByText(/Originally published on Ficly/)).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Kevin' })).not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Read the original' }))
			.toHaveAttribute('href', credit.url);
	});
});
