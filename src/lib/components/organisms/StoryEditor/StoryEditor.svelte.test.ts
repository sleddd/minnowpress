import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { expectAccessible } from '../../testing/helpers';
import StoryEditor from './StoryEditor.svelte';

const values = { title: '', body: '', tags: '', isMature: false, challengeId: '' };
const base = { appName: 'MinnowPress', values };

describe('StoryEditor', () => {
	it('renders an empty editor that posts to /write', async () => {
		const screen = await render(StoryEditor, base);
		await expect.element(screen.getByRole('heading', { name: 'Let’s Write' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('link', { name: 'Respect the MinnowPress rules!' }))
			.toHaveAttribute('href', '/terms');
		await expect.element(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
		await expect.element(screen.getByRole('textbox', { name: 'Tags' })).toBeInTheDocument();
		await expect.element(screen.getByText(/like: ducks, hunting, suits/)).toBeInTheDocument();
		await expect.element(screen.getByRole('textbox', { name: 'Story' })).toBeInTheDocument();
		await expect
			.element(screen.getByText('(60 character minimum not yet met)'))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/not a machine/)).toBeInTheDocument();
		await expect
			.element(screen.getByRole('textbox', { name: 'Title' }))
			.toHaveAttribute('placeholder', 'Untitled');
		await expect
			.element(screen.getByRole('textbox', { name: 'Story' }))
			.toHaveAttribute('placeholder', 'Once upon a time…');
		// Nothing to publish yet.
		await expect.element(screen.getByRole('button', { name: 'publish!' })).toBeDisabled();
		const form = screen.container.querySelector('form')!;
		expect(form.getAttribute('action')).toBe('/write');
		expect(form.getAttribute('method')).toBe('POST');
		await expectAccessible(screen.container);
	});

	it('counts graphemes live, clears the minimum note, and blocks publishing over 1024', async () => {
		const screen = await render(StoryEditor, base);
		const story = screen.getByRole('textbox', { name: 'Story' });
		await story.fill('👍'.repeat(5));
		await expect.element(screen.getByRole('status')).toHaveTextContent('5 / 1024');
		await story.fill('a'.repeat(60));
		await expect.element(screen.getByText(/character minimum/)).not.toBeInTheDocument();
		await expect.element(screen.getByRole('button', { name: 'publish!' })).toBeEnabled();
		await story.fill('a'.repeat(1025));
		await expect.element(screen.getByRole('button', { name: 'publish!' })).toBeDisabled();
		await expect.element(story).toHaveAttribute('aria-invalid', 'true');
	});

	it('switches between publishing and saving a draft', async () => {
		const screen = await render(StoryEditor, base);
		await expect
			.element(screen.getByRole('button', { name: 'publish!' }))
			.toHaveAttribute('value', 'publish');
		await screen.getByRole('checkbox', { name: 'Save as a draft' }).click();
		await expect
			.element(screen.getByRole('button', { name: 'save draft' }))
			.toHaveAttribute('value', 'draft');
	});

	it('carries continuation context', async () => {
		const screen = await render(StoryEditor, {
			...base,
			continuing: {
				relation: 'sequel',
				parent: { id: 3, title: 'The Lighthouse', author: { displayName: 'Jane' } }
			}
		});
		await expect
			.element(screen.getByRole('heading', { name: 'Write a sequel' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText(/What happens after/)).toBeInTheDocument();
		const data = new FormData(screen.container.querySelector('form')!);
		expect(data.get('parentId')).toBe('3');
		expect(data.get('relation')).toBe('sequel');
		await expectAccessible(screen.container);
	});

	it('shows server errors and prefilled values when editing a draft', async () => {
		const screen = await render(StoryEditor, {
			appName: 'M',
			values: { title: 'Draft', body: 'Body', tags: 'sea', isMature: true, challengeId: '4' },
			errors: { title: 'Give it a title.', body: 'Too long.', form: 'Something went wrong.' },
			challenges: [{ id: 4, title: 'Fog' }],
			editId: 9
		});
		await expect.element(screen.getByRole('heading', { name: 'Edit draft' })).toBeInTheDocument();
		await expect.element(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
		await expect.element(screen.getByText('Too long.')).toBeInTheDocument();
		await expect.element(screen.getByRole('checkbox', { name: 'Mature content' })).toBeChecked();
		await expect.element(screen.getByRole('checkbox', { name: 'Save as a draft' })).toBeChecked();
		await expect
			.element(screen.getByRole('combobox', { name: 'Enter a challenge' }))
			.toHaveValue('4');
		expect(new FormData(screen.container.querySelector('form')!).get('editId')).toBe('9');
	});

	it('hides the challenge picker when none are open', async () => {
		const screen = await render(StoryEditor, base);
		await expect.element(screen.getByRole('combobox')).not.toBeInTheDocument();
	});

	it('edits a published story: no draft option, and the button updates it', async () => {
		const screen = await render(StoryEditor, {
			appName: 'M',
			values: { title: 'Fog', body: 'b'.repeat(80), tags: '', isMature: false, challengeId: '' },
			editId: 7,
			editingPublished: true
		});
		await expect.element(screen.getByRole('heading', { name: 'Edit story' })).toBeInTheDocument();
		await expect
			.element(screen.getByRole('checkbox', { name: 'Save as a draft' }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'update!' }))
			.toHaveAttribute('value', 'publish');
		expect(new FormData(screen.container.querySelector('form')!).get('editId')).toBe('7');
	});

	it('asks the author to confirm they’re 18 or older when marking a story mature', async () => {
		const screen = await render(StoryEditor, base);
		const adult = screen.getByRole('checkbox', { name: 'I’m 18 or older' });
		await expect.element(adult).not.toBeInTheDocument();
		await screen.getByRole('checkbox', { name: 'Mature content' }).click();
		await expect.element(adult).toBeRequired();
		await expectAccessible(screen.container);
		await screen.unmount();

		const confirmed = await render(StoryEditor, {
			...base,
			values: { ...values, isMature: true },
			adultConfirmed: true
		});
		await expect
			.element(confirmed.getByRole('checkbox', { name: 'I’m 18 or older' }))
			.not.toBeInTheDocument();
	});

	it('keeps a story a moderator marked mature locked', async () => {
		const screen = await render(StoryEditor, {
			...base,
			values: { ...values, isMature: true },
			editId: 4,
			editingPublished: true,
			matureLocked: true
		});
		const mature = screen.getByRole('checkbox', { name: 'Mature content' });
		await expect.element(mature).toBeChecked();
		await expect.element(mature).toBeDisabled();
		await expect
			.element(screen.getByText('A moderator marked this story mature.'))
			.toBeInTheDocument();
	});
});
