<script lang="ts">
	import { formatDate } from '#lib/format.ts';
	import type { BlogPostView } from '#lib/types.ts';
	import { Link, Notice, Prose } from '../../atoms/index.ts';

	interface Props {
		post: BlogPostView;
		/** The post before this one, for the "Earlier" link. */
		previous?: { slug: string; title: string } | null;
		/** Admins get an edit link and see drafts. */
		canEdit?: boolean;
	}

	let { post, previous = null, canEdit = false }: Props = $props();
</script>

<article class="post" aria-labelledby="post-title">
	<p class="back"><Link href="/blog">← Blog</Link></p>
	{#if post.status === 'draft'}<Notice>This post is a draft. Only admins can see it.</Notice>{/if}

	<header class="head">
		<p class="meta">
			{post.publishedAt ? formatDate(post.publishedAt) : 'Not published'}
			{#if post.author}· <span class="author">{post.author}</span>{/if}
			{#if canEdit}· <a href="/admin/blog/{post.id}">Edit</a>{/if}
		</p>
		<h1 id="post-title">{post.title}</h1>
	</header>

	<div class="body"><Prose text={post.body} size="lg" /></div>

	{#if post.author}
		<!-- Signed off with a bookmark, like the logo's. -->
		<footer class="signature">
			<span class="bookmark" aria-hidden="true"></span>
			<div>
				<p>
					—
					{#if post.authorUsername}<Link href="/@{post.authorUsername}">{post.author}</Link
						>{:else}{post.author}{/if}
				</p>
				<p class="role">Runs the place.</p>
			</div>
		</footer>
	{/if}

	<nav class="next" aria-label="More posts">
		<div>
			<p class="label">Earlier</p>
			{#if previous}<Link href="/blog/{previous.slug}">{previous.title}</Link>{:else}<p
					class="none"
				>
					This is the first post.
				</p>{/if}
		</div>
		<div class="to">
			<p class="label">Back to</p>
			<Link href="/blog">All posts →</Link>
		</div>
	</nav>
</article>

<style>
	.post {
		display: grid;
		gap: var(--space-6);
	}

	.back :global(a),
	.next :global(a),
	.signature :global(a) {
		font-style: italic;
	}

	.head {
		display: grid;
		gap: var(--space-3);
		padding-bottom: var(--space-6);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.meta,
	.label {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.author {
		color: var(--color-accent);
	}

	h1 {
		color: var(--color-accent);
		font-size: var(--text-story-title);
		line-height: var(--leading-tight);
		text-wrap: balance;
	}

	.body :global(.prose) {
		font-size: var(--text-story);
	}

	/* An italic teal drop cap on the first paragraph. */
	.body :global(.prose p:first-child::first-letter) {
		float: left;
		margin-right: var(--space-2);
		color: var(--color-accent);
		font-size: var(--text-hero);
		font-style: italic;
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	.signature {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}

	.signature p:first-child {
		font-size: var(--text-lg);
	}

	.role,
	.none {
		color: var(--color-text-muted);
	}

	.role {
		font-size: var(--text-sm);
	}

	.none {
		font-style: italic;
	}

	.bookmark {
		--ribbon: var(--space-6);

		position: relative;
		flex: none;
		width: calc(var(--ribbon) * 1.15);
		height: calc(var(--ribbon) * 1.7);
		background: var(--color-accent);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%);
	}

	.bookmark::before,
	.bookmark::after {
		content: '';
		position: absolute;
		top: var(--space-0);
		bottom: var(--space-3);
		border-left: var(--border-width) dashed var(--color-nav-underline);
	}

	.bookmark::before {
		left: var(--space-1);
	}

	.bookmark::after {
		right: var(--space-1);
	}

	/* Earlier / back to: two halves between dashed rules. */
	.next {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border-block: var(--border-width) dashed var(--color-border-strong);
	}

	.next > div {
		display: grid;
		gap: var(--space-1);
		align-content: start;
		padding-block: var(--space-4);
	}

	.next > div:first-child {
		padding-right: var(--space-4);
	}

	.to {
		justify-items: end;
		padding-left: var(--space-4);
		border-left: var(--border-width) dashed var(--color-border-strong);
		text-align: right;
	}
</style>
