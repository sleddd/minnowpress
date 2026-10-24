<script lang="ts">
	import type { ModerationLogView } from '#lib/types.ts';
	import { Badge, Link, Text, Timestamp } from '../../atoms/index.ts';
	import { EmptyState, Pagination } from '../../molecules/index.ts';

	interface Props {
		entries: ModerationLogView[];
		page: number;
		hasMore: boolean;
		/** Current URL, for the pagination links. */
		url: { href: string };
	}

	let { entries, page, hasMore, url }: Props = $props();

	const label: Record<ModerationLogView['action'], string> = {
		remove_story: 'Removed story',
		restore_story: 'Restored story',
		delete_comment: 'Deleted comment',
		suspend_user: 'Suspended member',
		unsuspend_user: 'Lifted suspension',
		dismiss_report: 'Dismissed report',
		mark_mature: 'Marked mature',
		unmark_mature: 'Cleared mature',
		remove_challenge: 'Removed challenge'
	};
	const serious = new Set<ModerationLogView['action']>([
		'remove_story',
		'delete_comment',
		'suspend_user',
		'remove_challenge'
	]);

	const byline = (entry: ModerationLogView) =>
		`by ${entry.actor ? `@${entry.actor}` : 'a former moderator'}` +
		(entry.reportId ? ` · report #${entry.reportId}` : '');
</script>

<section class="log" aria-label="Moderation log">
	{#if entries.length === 0}
		<EmptyState title="Nothing yet" message="Moderator actions will be listed here." />
	{:else}
		<ol class="list" role="list">
			{#each entries as entry (entry.id)}
				<li class="item">
					<Badge tone={serious.has(entry.action) ? 'warning' : 'neutral'}
						>{label[entry.action]}</Badge
					>
					<Text as="span" size="sm">
						{#if entry.target.href}<Link href={entry.target.href}>{entry.target.label}</Link
							>{:else}{entry.target.label}{/if}
					</Text>
					<Text as="span" size="sm" tone="muted">{byline(entry)}</Text>
					<Timestamp date={entry.createdAt} />
				</li>
			{/each}
		</ol>
		<Pagination {page} {hasMore} {url} />
	{/if}
</section>

<style>
	.log,
	.list {
		display: grid;
		gap: var(--space-3);
	}

	.item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		padding: var(--space-3) var(--space-4);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
</style>
