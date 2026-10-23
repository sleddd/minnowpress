<script lang="ts">
	import { formatDate, pluralize } from '#lib/format.ts';
	import type { ChallengeView, TagCountView } from '#lib/types.ts';
	import { Heading, Link, TagPill, Text } from '../../atoms/index.ts';
	import { StoryListItem } from '../../molecules/index.ts';

	type Story = import('svelte').ComponentProps<typeof StoryListItem>['story'];

	export interface StoryColumn {
		title: string;
		blurb: string;
		stories: Story[];
		more?: { href: string; label: string } | null;
		empty?: string;
	}

	interface Props {
		columns: StoryColumn[];
		/** Adds a Tags lane, "Find your current." */
		tags?: TagCountView[] | null;
		/** Adds a Past challenges lane on the far right: titles that link to each challenge. */
		challenges?: ChallengeView[] | null;
	}

	let { columns, tags = null, challenges = null }: Props = $props();
	const slug = (s: string) => s.toLowerCase().replace(/\W+/g, '-');
</script>

<!-- Swim lanes: open columns divided by dashed rules. -->
<div class="lanes">
	<div class="grid">
		{#each columns as column (column.title)}
			<section class="lane" aria-labelledby="col-{slug(column.title)}">
				<div class="head">
					<Heading level={2} size="lg" id="col-{slug(column.title)}">{column.title}</Heading>
					<p class="blurb">{column.blurb}</p>
				</div>
				{#if column.stories.length}
					<ul class="stories" role="list">
						{#each column.stories as story (story.id)}
							<li><StoryListItem {story} variant="compact" byline="by" /></li>
						{/each}
					</ul>
					{#if column.more}<p class="more">
							<Link href={column.more.href}>{column.more.label}</Link>
						</p>{/if}
				{:else}
					<div class="empty">
						<Text><strong>Oh no!</strong> {column.empty ?? 'Nothing here yet.'}</Text>
						{#if column.more}<p class="more">
								<Link href={column.more.href}>{column.more.label}</Link>
							</p>{/if}
					</div>
				{/if}
			</section>
		{/each}
		{#if tags}
			<section class="lane" aria-labelledby="col-tags">
				<div class="head">
					<Heading level={2} size="lg" id="col-tags">Tags</Heading>
					<p class="blurb">Find your current.</p>
				</div>
				<ul class="tags" role="list">
					{#each tags as tag (tag.name)}<li><TagPill tag={tag.name} /></li>{/each}
				</ul>
			</section>
		{/if}
		{#if challenges}
			<section class="lane" aria-labelledby="col-past-challenges">
				<div class="head">
					<Heading level={2} size="lg" id="col-past-challenges">Past challenges</Heading>
					<p class="blurb">Closed, still worth reading.</p>
				</div>
				{#if challenges.length}
					<ul class="stories" role="list">
						{#each challenges as challenge (challenge.id)}
							<li class="challenge">
								<Link href="/challenges/{challenge.id}" variant="story">{challenge.title}</Link>
								<span class="meta"
									>{#if challenge.endsAt}Ended {formatDate(
											challenge.endsAt
										)}&nbsp;·&nbsp;{/if}{pluralize(
										challenge.entries ?? 0,
										'entry',
										'entries'
									)}</span
								>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="empty"><Text>No challenge has closed yet.</Text></div>
				{/if}
				<p class="more"><Link href="/challenges">All challenges</Link></p>
			</section>
		{/if}
	</div>
</div>

<style>
	.lanes {
		container-type: inline-size;
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	.lane {
		display: grid;
		gap: var(--space-5);
		align-content: start;
		padding-block: var(--space-6);
	}

	.lane + .lane {
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.head {
		display: grid;
		gap: var(--space-1);
	}

	.blurb {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.stories li {
		padding-block: var(--space-3);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.stories li:first-child {
		padding-top: var(--space-0);
	}

	.stories :global(.title) {
		font-size: var(--text-lg);
	}

	.more {
		font-size: var(--text-lg);
		font-style: italic;
	}

	.more :global(a) {
		text-decoration: underline;
	}

	.empty {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-5);
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.empty strong {
		color: var(--color-accent);
	}

	.challenge {
		display: grid;
		gap: var(--space-1);
		overflow-wrap: anywhere;
	}

	.challenge :global(a) {
		font-size: var(--text-lg);
	}

	.meta {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-2);
	}

	/* Side by side when there's room: one lane per column, dashed rules between. */
	@container (min-width: 48rem) {
		.grid {
			grid-auto-columns: minmax(0, 1fr);
			grid-auto-flow: column;
			grid-template-columns: none;
		}

		.lane {
			padding: var(--space-0) var(--space-6);
		}

		.lane:first-child {
			padding-left: var(--space-0);
		}

		.lane:last-child {
			padding-right: var(--space-0);
		}

		.lane + .lane {
			border-top: 0;
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}
</style>
