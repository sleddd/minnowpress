<script lang="ts">
	import type { ActivityEventView } from '#lib/types.ts';
	import { Heading, Link, Text, Timestamp } from '../../atoms/index.ts';

	interface Props {
		items: ActivityEventView[];
		now?: Date;
	}

	let { items, now = new Date() }: Props = $props();
</script>

<section class="activity" aria-labelledby="activity-title">
	<Heading level={2} size="md" id="activity-title">Recent Activity</Heading>
	{#if items.length}
		<ul role="list">
			{#each items as event, i (i)}
				<li>
					<Text>
						<Link href="/@{event.actor.username}"><em>{event.actor.displayName}</em></Link>
						{#if event.kind === 'comment'}
							commented on
						{:else}
							wrote a {event.kind},
							<Link href="/s/{event.continuation?.id}" variant="story"
								>{event.continuation?.title}</Link
							>, to
						{/if}
						<Link href="/s/{event.story.id}" variant="story">{event.story.title}</Link>
						<Timestamp date={event.at} {now} />
					</Text>
				</li>
			{/each}
		</ul>
	{:else}
		<Text tone="muted"
			>Nothing yet. When people comment on or continue your stories, you’ll see it here.</Text
		>
	{/if}
</section>

<style>
	.activity,
	ul {
		display: grid;
		gap: var(--space-3);
	}

	li {
		padding-bottom: var(--space-3);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}
</style>
