<script lang="ts">
	import type { ActivityEventView } from '#lib/types.ts';
	import { Heading, Link, Text, Timestamp } from '../../atoms/index.ts';

	interface Props {
		items: ActivityEventView[];
		title?: string;
		/** 1 when the list is the whole page, 2 on the desk. */
		level?: 1 | 2;
		/** A link under the list: all activity from the desk, older activity on its own page. */
		more?: { href: string; label: string } | null;
		now?: Date;
	}

	let {
		items,
		title = 'Recent Activity',
		level = 2,
		more = null,
		now = new Date()
	}: Props = $props();
</script>

<section class="activity" aria-labelledby="activity-title">
	<Heading {level} size={level === 1 ? 'lg' : 'md'} id="activity-title">{title}</Heading>
	{#if items.length}
		<ul role="list">
			{#each items as event, i (i)}
				<li>
					<Text>
						{#if event.kind === 'rated'}
							You rated
							<Link href="/s/{event.story.id}" variant="story">{event.story.title}</Link>
							{event.score} fish
						{:else}
							<Link href="/@{event.actor?.username}"><em>{event.actor?.displayName}</em></Link>
							{#if event.kind === 'rating'}
								rated
							{:else if event.kind === 'comment'}
								commented on
							{:else}
								wrote a {event.kind},
								<Link href="/s/{event.continuation?.id}" variant="story"
									>{event.continuation?.title}</Link
								>, to
							{/if}
							<Link href="/s/{event.story.id}" variant="story">{event.story.title}</Link>
							{#if event.kind === 'rating'}{event.score} fish{/if}
						{/if}
						<Timestamp date={event.at} {now} />
					</Text>
				</li>
			{/each}
		</ul>
	{:else}
		<Text tone="muted"
			>Nothing yet. When people comment on, continue or rate your stories, or you rate one, you’ll
			see it here.</Text
		>
	{/if}
	{#if more}<div><Link href={more.href}>{more.label}</Link></div>{/if}
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
