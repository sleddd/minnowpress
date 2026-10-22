<script lang="ts">
	import { Button, Notice, Text } from '../../atoms/index.ts';
	import { FormField } from '../../molecules/index.ts';

	interface Props {
		values: { title: string; body: string };
		errors?: Partial<Record<'title' | 'body', string>>;
		/** Set when editing an existing post. */
		post?: { id: number; slug: string; status: 'draft' | 'published' } | null;
		saved?: boolean;
	}

	let { values, errors = {}, post = null, saved = false }: Props = $props();
</script>

<form class="editor" method="POST" action="?/save">
	{#if saved}<Notice tone="success">Saved.</Notice>{/if}
	{#if post?.status === 'published'}
		<Text size="sm" tone="muted"
			>Published at /blog/{post.slug}. The address stays the same when you edit.</Text
		>
	{/if}
	<FormField
		id="post-title"
		name="title"
		label="Title"
		value={values.title}
		error={errors.title}
		required
		maxlength={150}
	/>
	<FormField
		id="post-body"
		name="body"
		label="Post"
		type="textarea"
		rows={16}
		value={values.body}
		error={errors.body}
		required
		hint="Plain text. Leave a blank line between paragraphs."
	/>
	<div class="buttons">
		<Button type="submit" name="intent" value="draft" variant="secondary">
			{post?.status === 'published' ? 'Unpublish' : 'Save draft'}
		</Button>
		<Button type="submit" name="intent" value="publish"
			>{post?.status === 'published' ? 'Update' : 'Publish'}</Button
		>
		{#if post}
			<Button type="submit" formaction="?/delete" variant="ghost" formnovalidate>Delete</Button>
		{/if}
	</div>
</form>

<style>
	.editor {
		display: grid;
		gap: var(--space-4);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
</style>
