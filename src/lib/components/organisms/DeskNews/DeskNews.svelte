<script lang="ts">
	import { excerpt, formatDate } from '#lib/format.ts';
	import type { BlogPostView } from '#lib/types.ts';
	import { Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
		post: Pick<BlogPostView, 'slug' | 'title' | 'body' | 'publishedAt'> | null;
	}

	let { appName, post }: Props = $props();
</script>

<section class="news" aria-labelledby="news-title">
	<Heading level={2} size="md" id="news-title">{appName} News</Heading>
	{#if post}
		<Heading level={3} size="md" tone="ink"
			><Link href="/blog/{post.slug}" variant="title">{post.title}</Link></Heading
		>
		{#if post.publishedAt}<Text size="sm" tone="muted">{formatDate(post.publishedAt)}</Text>{/if}
		<Text>{excerpt(post.body, 280)}</Text>
		<Link href="/blog">More news</Link>
	{:else}
		<Text tone="muted">No news yet. Check the <Link href="/blog">blog</Link> later.</Text>
	{/if}
</section>

<style>
	.news {
		display: grid;
		gap: var(--space-3);
		justify-items: start;
	}
</style>
