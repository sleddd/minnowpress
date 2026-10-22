<script lang="ts">
	import { countGraphemes, STORY_MAX, STORY_MIN } from '#lib/text.ts';
	import type { Relation } from '#lib/types.ts';
	import {
		CharCount,
		FieldError,
		Heading,
		Label,
		Link,
		Notice,
		Text,
		TextArea,
		VisuallyHidden
	} from '../../atoms/index.ts';
	import { BlockField, CheckboxField, SelectField, StoryLink } from '../../molecules/index.ts';

	export interface EditorValues {
		title: string;
		body: string;
		tags: string;
		isMature: boolean;
		challengeId: string;
	}

	interface Props {
		appName: string;
		values: EditorValues;
		errors?: Partial<Record<'title' | 'body' | 'tags' | 'challenge' | 'form', string>>;
		/** Set when writing a prequel or sequel. */
		continuing?: {
			relation: Relation;
			parent: { id: number; title: string; author: { displayName: string } };
		} | null;
		/** Open challenges the story can be entered into. */
		challenges?: { id: number; title: string }[];
		/** Set when editing an existing story. */
		editId?: number | null;
		/** Editing a story that's already published: it stays published, so no draft option. */
		editingPublished?: boolean;
	}

	let {
		appName,
		values,
		errors = {},
		continuing = null,
		challenges = [],
		editId = null,
		editingPublished = false
	}: Props = $props();

	// The editor owns its fields once mounted; the page re-keys it when server values change.
	// svelte-ignore state_referenced_locally
	let title = $state(values.title);
	// svelte-ignore state_referenced_locally
	let body = $state(values.body);
	// svelte-ignore state_referenced_locally
	let tags = $state(values.tags);
	// svelte-ignore state_referenced_locally
	let isMature = $state(values.isMature);
	// svelte-ignore state_referenced_locally
	let challengeId = $state(values.challengeId);
	// Editing a draft keeps it a draft unless the writer unticks this.
	// svelte-ignore state_referenced_locally
	let saveDraft = $state(Boolean(editId));

	const count = $derived(countGraphemes(body.trim()));
	const over = $derived(count > STORY_MAX);
	const short = $derived(count < STORY_MIN);
	const challengeOptions = $derived([
		{ value: '', label: 'None' },
		...challenges.map((c) => ({ value: String(c.id), label: c.title }))
	]);
	const heading = $derived(
		editingPublished
			? 'Edit story'
			: editId
				? 'Edit draft'
				: continuing
					? `Write a ${continuing.relation}`
					: 'Let’s Write'
	);
	const action = $derived(editingPublished ? 'update!' : saveDraft ? 'save draft' : 'publish!');
</script>

<form class="editor" method="POST" action="/write">
	<div class="head">
		<Heading level={1} size="xl">{heading}</Heading>
		<a class="rules" href="/terms">Respect the {appName} rules!</a>
	</div>

	{#if continuing}
		<Text tone="muted">
			{continuing.relation === 'sequel' ? 'What happens after' : 'What happened before'}
			<StoryLink story={{ ...continuing.parent, relation: null }} />
		</Text>
		<input type="hidden" name="parentId" value={continuing.parent.id} />
		<input type="hidden" name="relation" value={continuing.relation} />
	{/if}
	{#if editId}<input type="hidden" name="editId" value={editId} />{/if}

	{#if errors.form}<Notice tone="error">{errors.form}</Notice>{/if}

	<BlockField
		id="title"
		name="title"
		label="Title"
		size="lg"
		placeholder="Untitled"
		bind:value={title}
		error={errors.title}
		required
		maxlength={100}
	/>
	<BlockField
		id="tags"
		name="tags"
		label="Tags"
		placeholder="ducks, hunting, suits"
		bind:value={tags}
		error={errors.tags}
		hint="Up to five, separated by commas, like: ducks, hunting, suits"
	/>

	<div class="body" class:invalid={over || Boolean(errors.body)}>
		<VisuallyHidden><Label for="body">Story</Label></VisuallyHidden>
		<TextArea
			id="body"
			name="body"
			prose
			rows={12}
			placeholder="Once upon a time…"
			bind:value={body}
			invalid={over || Boolean(errors.body)}
			aria-describedby="body-count body-min{errors.body ? ' body-error' : ''}"
			required
			spellcheck="true"
		/>
		<div class="bar">
			<span id="body-min" class="min"
				>{#if short}({STORY_MIN} character minimum not yet met){/if}</span
			>
			<CharCount id="body-count" {count} max={STORY_MAX} />
		</div>
	</div>
	<FieldError id="body-error" message={errors.body} />

	{#if challenges.length}
		<div class="challenge">
			<SelectField
				id="challengeId"
				name="challengeId"
				label="Enter a challenge"
				options={challengeOptions}
				bind:value={challengeId}
				error={errors.challenge}
			/>
		</div>
	{/if}

	<div class="options">
		<div class="checks">
			<CheckboxField
				id="isMature"
				name="isMature"
				label="Mature content"
				hint="Hidden from readers who haven't opted in."
				bind:checked={isMature}
			/>
			{#if !editingPublished}
				<CheckboxField
					id="saveDraft"
					name="saveDraft"
					label="Save as a draft"
					bind:checked={saveDraft}
				/>
			{/if}
		</div>
		<button
			class="publish"
			type="submit"
			name="intent"
			value={saveDraft && !editingPublished ? 'draft' : 'publish'}
			disabled={over || short}>{action}</button
		>
	</div>

	<p class="fine">
		Written by a person, not a machine: stories generated by AI are removed. Published stories are
		shared under a
		<Link href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener"
			>Creative Commons license</Link
		>, so others can write prequels and sequels to them. You can edit your stories after they're
		published.
	</p>
</form>

<style>
	.editor {
		display: grid;
		gap: var(--space-6);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.rules {
		color: var(--color-accent);
		font-style: italic;
		text-decoration: underline dotted;
		text-underline-offset: 0.25em;
	}

	/* The writing area: a dashed sheet with the counter along the bottom. */
	.body {
		display: grid;
		border: var(--border-width) dashed var(--color-border-strong);
		background: var(--color-surface);
	}

	.body:focus-within {
		border-color: var(--color-accent);
	}

	.body.invalid {
		border-color: var(--color-danger);
	}

	.body :global(textarea) {
		padding: var(--space-5) var(--space-6);
		border: 0;
		border-radius: var(--space-0);
		background: transparent;
		font-size: var(--text-story);
	}

	.body :global(textarea:focus) {
		box-shadow: none;
	}

	.bar {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-6);
		border-top: var(--border-width) dashed var(--color-border-strong);
		background: var(--color-bg);
	}

	.min {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-style: italic;
	}

	.challenge :global(label) {
		color: var(--color-accent);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.challenge :global(select) {
		border: var(--border-width) dashed var(--color-border-strong);
		border-radius: var(--space-0);
		background-color: var(--color-bg);
		color: var(--color-accent);
		font-style: italic;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.checks {
		display: grid;
		gap: var(--space-3);
	}

	/* A ribbon with a notched tail, like the nav. */
	.publish {
		--notch: var(--space-4);
		--pad-end: calc(var(--notch) + var(--space-5));

		padding: var(--space-3) var(--pad-end) var(--space-3) var(--space-6);
		border: 0;
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font: inherit;
		font-size: var(--text-xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		cursor: pointer;
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.publish:hover {
		background: var(--color-accent-hover);
	}

	.publish:disabled {
		background: var(--color-nav-underline);
		cursor: not-allowed;
	}

	.publish:focus-visible {
		outline: var(--border-width) solid var(--color-focus);
		outline-offset: var(--space-1);
	}

	.fine {
		max-width: var(--measure);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
