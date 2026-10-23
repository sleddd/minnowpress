<script lang="ts">
	import { pluralize } from '#lib/format.ts';
	import type { AuthorEntryView } from '#lib/types.ts';
	import { Avatar, Link, Text } from '../../atoms/index.ts';

	interface Props {
		author: AuthorEntryView;
		/**
		 * Directory style: a smaller name over the bare story count, for a grid under a heading
		 * that already says where its writers come from.
		 */
		compact?: boolean;
	}

	let { author, compact = false }: Props = $props();
</script>

<div class="author" class:compact>
	<Avatar name={author.name} src={author.avatarUrl} size="lg" />
	<div class="text">
		<Link href={author.href}>{author.name}</Link>
		<Text as="span" size={compact ? 'xs' : 'sm'} tone="muted"
			>{pluralize(author.stories, 'story', 'stories')}{author.archive && !compact
				? ' · Ficly archive'
				: ''}</Text
		>
	</div>
</div>

<style>
	.author {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.text {
		display: grid;
		gap: var(--space-1);
		font-size: var(--text-lg);
		line-height: var(--leading-tight);
	}

	.compact .text {
		font-size: var(--text-md);
	}
</style>
