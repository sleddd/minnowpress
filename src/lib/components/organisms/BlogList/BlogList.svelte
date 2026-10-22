<script lang="ts">
	import { excerpt, formatDate } from '#lib/format.ts';
	import type { BlogPostView } from '#lib/types.ts';
	import { Heading, Link } from '../../atoms/index.ts';
	import { Pagination } from '../../molecules/index.ts';

	interface Props {
		posts: BlogPostView[];
		page: number;
		hasMore: boolean;
		url: { href: string };
	}

	let { posts, page, hasMore, url }: Props = $props();
</script>

<section class="blog" aria-labelledby="blog-title">
	<header class="head">
		<Heading level={1} size="xl" id="blog-title">The Minnow Pond</Heading>
		<p class="sub">News and notes from the people who run the place.</p>
	</header>

	{#if posts.length}
		<ol class="posts" role="list">
			{#each posts as post (post.id)}
				<li>
					<article aria-labelledby="post-{post.id}">
						<p class="when">
							{#if post.publishedAt}<span>{formatDate(post.publishedAt)}</span>{/if}
							{#if post.author}<span class="by">{post.author}</span>{/if}
						</p>
						<div class="what">
							<h2 id="post-{post.id}"><a href="/blog/{post.slug}">{post.title}</a></h2>
							<p>{excerpt(post.body, 220)}</p>
							<p class="read"><Link href="/blog/{post.slug}">Read the post</Link></p>
						</div>
					</article>
				</li>
			{/each}
		</ol>
		<Pagination {page} {hasMore} {url} />
	{:else}
		<p class="none">No posts yet. Check back soon.</p>
	{/if}
</section>

<style>
	.blog {
		display: grid;
		gap: var(--space-6);
	}

	.head {
		display: grid;
		gap: var(--space-2);
		padding-bottom: var(--space-6);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.sub,
	.none,
	.by {
		color: var(--color-text-muted);
	}

	.none {
		font-style: italic;
	}

	.posts li {
		padding-bottom: var(--space-6);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.posts li + li {
		padding-top: var(--space-6);
	}

	/* Date and author in a narrow column, the post beside it. */
	article {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-2) var(--space-7);
	}

	.when {
		display: flex;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	.what {
		display: grid;
		gap: var(--space-2);
		line-height: var(--leading-prose);
	}

	h2 {
		font-size: var(--text-2xl);
		line-height: var(--leading-tight);
	}

	h2 a {
		color: var(--color-accent);
		text-decoration: none;
	}

	h2 a:hover {
		text-decoration: underline;
	}

	.read :global(a) {
		font-style: italic;
	}

	@media (min-width: 40rem) {
		article {
			grid-template-columns: 8rem minmax(0, 1fr);
		}

		.when {
			flex-direction: column;
			gap: var(--space-0);
			padding-top: var(--space-2);
		}

		.by {
			font-size: var(--text-xs);
		}
	}
</style>
