<script lang="ts">
	import { pluralize } from '#lib/format.ts';
	import type { AuthorEntryView } from '#lib/types.ts';
	import { Avatar, Link, Text } from '../../atoms/index.ts';

	interface Props {
		author: AuthorEntryView;
	}

	let { author }: Props = $props();
</script>

<div class="author">
	<Avatar name={author.name} src={author.avatarUrl} size="lg" />
	<div class="text">
		<Link href={author.href}>{author.name}</Link>
		<Text as="span" size="sm" tone="muted"
			>{pluralize(author.stories, 'story', 'stories')}{author.archive
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
		font-size: var(--text-lg);
		line-height: var(--leading-tight);
	}
</style>
