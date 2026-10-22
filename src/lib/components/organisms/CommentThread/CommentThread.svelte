<script lang="ts">
	import { enhance } from '$app/forms';
	import type { CommentView } from '#lib/types.ts';
	import { Button, Heading, Link, Prose, Text } from '../../atoms/index.ts';
	import { CommentForm, ReportForm, StoryMeta } from '../../molecules/index.ts';

	interface Props {
		storyId: number;
		comments: CommentView[];
		viewerId: number | null;
		isModerator: boolean;
		error?: string | null;
	}

	let { storyId, comments, viewerId, isModerator, error }: Props = $props();
</script>

<section class="thread" id="comments" aria-labelledby="comments-title">
	<div class="head">
		<Heading level={2} size="lg" id="comments-title">Comments</Heading>
		{#if !comments.length}<span class="none">No comments yet.</span>{/if}
	</div>

	{#if comments.length}
		<ol class="list" role="list">
			{#each comments as comment (comment.id)}
				<li class="comment">
					<StoryMeta author={comment.author} date={comment.createdAt} />
					<Prose text={comment.body} size="md" />
					<div class="actions">
						{#if comment.author.id === viewerId || isModerator}
							<form method="POST" action="/s/{storyId}?/deleteComment" use:enhance>
								<input type="hidden" name="commentId" value={comment.id} />
								<Button type="submit" variant="ghost" size="sm">Delete</Button>
							</form>
						{/if}
						{#if viewerId && comment.author.id !== viewerId}
							<ReportForm
								action="/s/{storyId}?/report"
								targetType="comment"
								targetId={comment.id}
							/>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{/if}

	{#if viewerId}
		<CommentForm action="/s/{storyId}?/comment" {error} />
	{:else}
		<Text tone="muted"><Link href="/login?next=/s/{storyId}">Sign in</Link> to comment.</Text>
	{/if}
</section>

<style>
	.thread {
		display: grid;
		gap: var(--space-5);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-3);
	}

	.none {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.list {
		display: grid;
		gap: var(--space-4);
	}

	.comment {
		display: grid;
		gap: var(--space-2);
		padding-bottom: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.actions:empty {
		display: none;
	}
</style>
