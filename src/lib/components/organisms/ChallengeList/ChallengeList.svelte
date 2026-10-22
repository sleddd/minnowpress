<script lang="ts">
	import { daysLeft, excerpt, formatDate, pluralize } from '#lib/format.ts';
	import type { ChallengeView } from '#lib/types.ts';
	import { Badge, Heading, Link, Text } from '../../atoms/index.ts';
	import { Pagination } from '../../molecules/index.ts';

	interface Props {
		open: ChallengeView[];
		/** Approved, waiting their turn. */
		upcoming?: ChallengeView[];
		closed: ChallengeView[];
		/** Past challenges are paged; open ones show on page 1. */
		page?: number;
		hasMore?: boolean;
		url?: { href: string } | null;
		/** Signed-out readers are sent to sign in before entering. */
		signedIn?: boolean;
	}

	let {
		open,
		upcoming = [],
		closed,
		page = 1,
		hasMore = false,
		url = null,
		signedIn = false
	}: Props = $props();

	const enterHref = (id: number) => {
		const write = `/write?challenge=${id}`;
		return signedIn ? write : `/login?next=${encodeURIComponent(write)}`;
	};
	const range = (c: ChallengeView) =>
		[c.startsAt, c.endsAt]
			.filter((d): d is Date => Boolean(d))
			.map((d) => formatDate(d))
			.join(' – ');
</script>

{#snippet row(c: ChallengeView, note: string)}
	<li class="row">
		<div class="what">
			<Link href="/challenges/{c.id}" variant="story">{c.title}</Link>
			<Text size="sm">{excerpt(c.promptText, 90)}</Text>
		</div>
		<span class="dates">{note}</span>
		<span class="entries">{pluralize(c.entries ?? 0, 'entry', 'entries')}</span>
	</li>
{/snippet}

<div class="challenges">
	<header class="intro">
		<div>
			<Heading level={1} size="xl">Challenges</Heading>
			<Text
				>One challenge at a time, each open for 14 days. Write 1,024 characters or less in answer to
				it.</Text
			>
		</div>
		<a class="create" href="/challenges/new">Create a new challenge</a>
	</header>

	{#if page === 1}
		{#each open as c (c.id)}
			{@const days = daysLeft(c.endsAt)}
			<section class="open" aria-labelledby="open-{c.id}">
				<span class="flag">open now</span>
				<div class="main">
					<h2 id="open-{c.id}"><a href="/challenges/{c.id}">{c.title}</a></h2>
					<p class="prompt">{c.promptText}</p>
					<p class="facts">
						<span>{pluralize(c.entries ?? 0, 'entry', 'entries')}</span>
						{#if c.startsAt}<span>Started {formatDate(c.startsAt)}</span>{/if}
						{#if c.endsAt}<span>Ends {formatDate(c.endsAt)}</span>{/if}
						{#if c.source === 'ai'}<Badge>AI-suggested prompt</Badge>{/if}
					</p>
					<p class="links">
						<Link href={enterHref(c.id)}>Enter the challenge</Link> or
						<Link href="/challenges/{c.id}">read the entries</Link>
					</p>
				</div>
				{#if days !== null}
					<p class="countdown">
						{#if days === 0}<span class="unit">last day</span>{:else}<strong>{days}</strong>
							<span class="unit">{days === 1 ? 'day left' : 'days left'}</span>{/if}
					</p>
				{/if}
			</section>
		{:else}
			<div class="none">
				<Text><strong>Oh no!</strong> No challenge is open right now. A new one starts soon.</Text>
			</div>
		{/each}

		{#if upcoming.length}
			<section class="list" aria-labelledby="upcoming-title">
				<div class="head">
					<Heading level={2} size="lg" id="upcoming-title">Coming up</Heading>
					<span class="note">Approved, waiting their turn.</span>
				</div>
				<ul role="list">
					{#each upcoming as c (c.id)}
						{@render row(c, c.startsAt ? `Starts ${formatDate(c.startsAt)}` : '')}
					{/each}
				</ul>
			</section>
		{/if}
	{/if}

	<section class="list" aria-labelledby="closed-title">
		<div class="head">
			<Heading level={2} size="lg" id="closed-title">Past challenges</Heading>
			<span class="note">Closed, but still worth reading.</span>
		</div>
		{#if closed.length}
			<ul role="list">
				{#each closed as c (c.id)}{@render row(c, range(c))}{/each}
			</ul>
		{:else}
			<Text tone="muted"
				>None yet. When a challenge’s 14 days are up, it moves here with all its entries.</Text
			>
		{/if}
	</section>
	{#if url}<Pagination {page} {hasMore} {url} />{/if}
</div>

<style>
	.challenges {
		display: grid;
		gap: var(--space-8);
	}

	.intro {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4) var(--space-6);
	}

	.intro > div {
		display: grid;
		gap: var(--space-3);
		max-width: var(--measure);
	}

	.intro :global(h1) {
		font-size: var(--text-story-title);
	}

	.create {
		padding: var(--space-2) var(--space-4);
		border: var(--border-width) dashed var(--color-accent);
		color: var(--color-accent);
		font-style: italic;
		font-weight: var(--weight-bold);
		text-decoration: none;
	}

	.create:hover {
		background: var(--color-accent-soft);
	}

	/* The open challenge: a dashed card with an "open now" ribbon on its corner. */
	.open {
		position: relative;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-6);
		padding: var(--space-8) var(--space-7) var(--space-7);
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.flag {
		--notch: var(--space-3);
		--pad-end: calc(var(--notch) + var(--space-5));
		--hang: calc(var(--space-5) * -1);

		position: absolute;
		top: var(--hang);
		left: var(--hang);
		padding: var(--space-2) var(--pad-end) var(--space-2) var(--space-5);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-size: var(--text-lg);
		font-style: italic;
		font-weight: var(--weight-bold);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.main {
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}

	h2 {
		font-size: var(--text-2xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	h2 a {
		color: var(--color-accent);
		text-decoration: none;
	}

	h2 a:hover {
		text-decoration: underline;
	}

	.prompt {
		max-width: var(--measure);
		font-size: var(--text-lg);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-5);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.links {
		font-size: var(--text-lg);
		font-style: italic;
	}

	.links :global(a) {
		text-decoration: underline;
	}

	.countdown {
		display: grid;
		justify-items: center;
		flex: none;
		color: var(--color-text-muted);
	}

	.countdown strong {
		color: var(--color-accent);
		font-size: var(--text-3xl);
		line-height: var(--leading-tight);
	}

	.unit {
		font-size: var(--text-sm);
	}

	.none {
		padding: var(--space-6);
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.none strong {
		color: var(--color-accent);
	}

	/* Past and upcoming: rows between dashed rules, dates and entries on the right. */
	.list {
		display: grid;
		gap: var(--space-4);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-3);
		padding-bottom: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.note {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: var(--space-2) var(--space-8);
		align-items: baseline;
		padding-block: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.what {
		display: grid;
		gap: var(--space-1);
	}

	.what :global(a) {
		font-size: var(--text-xl);
	}

	.dates {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
	}

	.entries {
		color: var(--color-accent);
		font-style: italic;
		white-space: nowrap;
	}

	@media (max-width: 40rem) {
		.open {
			flex-direction: column-reverse;
			padding-inline: var(--space-5);
		}

		.row {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.dates {
			grid-row: 2;
		}
	}
</style>
