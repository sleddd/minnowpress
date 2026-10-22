<script lang="ts">
	import { Avatar, Link, Timestamp } from '../../atoms/index.ts';

	export interface Author {
		username: string;
		displayName: string;
		avatarUrl: string | null;
	}

	interface Props {
		author: Author;
		date?: Date | string | null;
		size?: 'sm' | 'md';
	}

	let { author, date, size = 'sm' }: Props = $props();
</script>

<div class="meta">
	<Avatar name={author.displayName} src={author.avatarUrl} {size} />
	<Link href="/@{author.username}" variant="subtle">{author.displayName}</Link>
	{#if date}<span class="dot" aria-hidden="true">·</span><Timestamp {date} />{/if}
</div>

<style>
	.meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}

	.dot {
		color: var(--color-text-muted);
	}
</style>
