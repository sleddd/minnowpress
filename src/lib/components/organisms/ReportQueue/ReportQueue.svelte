<script lang="ts">
	import { enhance } from '$app/forms';
	import { excerpt } from '#lib/format.ts';
	import type { ReportView } from '#lib/types.ts';
	import { Badge, Button, Link, Text, Timestamp } from '../../atoms/index.ts';
	import { EmptyState } from '../../molecules/index.ts';

	interface Props {
		reports: ReportView[];
	}

	let { reports }: Props = $props();

	const reasonLabel: Record<ReportView['reason'], string> = {
		ai_generated: 'Suspected AI',
		mature: 'Should be mature',
		spam: 'Spam',
		abuse: 'Abuse',
		other: 'Other'
	};
</script>

<section class="queue" aria-label="Reports">
	{#if reports.length === 0}
		<EmptyState title="All clear" message="There are no open reports." />
	{:else}
		<ol class="list" role="list">
			{#each reports as report (report.id)}
				<li class="item">
					<div class="head">
						<Badge tone={report.reason === 'ai_generated' ? 'warning' : 'neutral'}
							>{reasonLabel[report.reason]}</Badge
						>
						<Text as="span" size="sm" tone="muted"
							>{report.targetType} reported by @{report.reporter}</Text
						>
						<Timestamp date={report.createdAt} />
					</div>
					{#if report.target}
						<Link href="/s/{report.target.storyId}">{report.target.title}</Link>
						<Text>{excerpt(report.target.body, 400)}</Text>
					{:else}
						<Text tone="muted">The reported item no longer exists.</Text>
					{/if}
					{#if report.note}<Text size="sm" tone="muted">Note: {report.note}</Text>{/if}
					<form class="actions" method="POST" action="?/resolve" use:enhance>
						<input type="hidden" name="reportId" value={report.id} />
						<Button type="submit" name="action" value="remove" variant="danger" size="sm"
							>Remove {report.targetType}</Button
						>
						{#if report.targetType === 'story' && report.target}
							<Button type="submit" name="action" value="mature" variant="secondary" size="sm"
								>Mark mature</Button
							>
						{/if}
						<Button type="submit" name="action" value="dismiss" variant="secondary" size="sm"
							>Dismiss</Button
						>
					</form>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.queue,
	.list {
		display: grid;
		gap: var(--space-4);
	}

	.item {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-4);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.head,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
</style>
