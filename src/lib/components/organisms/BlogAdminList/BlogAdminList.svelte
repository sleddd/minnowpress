<script lang="ts">
	import { formatDate } from '#lib/format.ts';
	import type { BlogPostView } from '#lib/types.ts';
	import { Badge, Link, Text } from '../../atoms/index.ts';
	import { EmptyState } from '../../molecules/index.ts';

	interface Props {
		posts: BlogPostView[];
	}

	let { posts }: Props = $props();
</script>

<section class="admin-blog" aria-label="Blog posts">
	{#if posts.length}
		<ul class="list" role="list">
			{#each posts as post (post.id)}
				<li>
					<Link href="/admin/blog/{post.id}">{post.title}</Link>
					<Badge tone={post.status === 'published' ? 'success' : 'neutral'}>{post.status}</Badge>
					<Text as="span" size="sm" tone="muted">
						{post.publishedAt
							? formatDate(post.publishedAt)
							: `edited ${formatDate(post.updatedAt)}`}
					</Text>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			title="No posts yet"
			action={{ href: '/admin/blog/new', label: 'Write the first one' }}
		/>
	{/if}
</section>

<style>
	.admin-blog {
		display: grid;
		gap: var(--space-5);
	}

	.list {
		display: grid;
	}

	.list li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding-block: var(--space-3);
		border-bottom: var(--border-width) dotted var(--color-rule);
	}
</style>
