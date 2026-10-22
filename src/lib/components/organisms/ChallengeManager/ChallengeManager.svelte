<script lang="ts">
	import { enhance } from '$app/forms';
	import { excerpt, formatDate, pluralize, toDateInput } from '#lib/format.ts';
	import type { ChallengeView } from '#lib/types.ts';
	import { Badge, Heading, Link, Notice } from '../../atoms/index.ts';
	import { Pagination } from '../../molecules/index.ts';

	interface Props {
		open: ChallengeView[];
		upcoming: ChallengeView[];
		closed: ChallengeView[];
		page?: number;
		hasMore?: boolean;
		url?: { href: string } | null;
		/** What the last action did, e.g. "Closed “Fog”. “Tide” is open now." */
		message?: string | null;
		/** A date problem from the last "Change dates", shown on that row. */
		datesError?: { id: number; message: string } | null;
	}

	let {
		open,
		upcoming,
		closed,
		page = 1,
		hasMore = false,
		url = null,
		message = null,
		datesError = null
	}: Props = $props();

	const dates = (c: ChallengeView) =>
		[c.startsAt, c.endsAt]
			.filter((d): d is Date => Boolean(d))
			.map((d) => formatDate(d))
			.join(' – ');
	const entries = (c: ChallengeView) => pluralize(c.entries ?? 0, 'entry', 'entries');
</script>

{#snippet rows(items: ChallengeView[], status: 'open' | 'upcoming' | 'closed', first = 1)}
	<ol class="rows" role="list">
		{#each items as c, i (c.id)}
			<li class="row">
				<span class="n">{first + i}</span>
				<div class="what">
					<Link href="/challenges/{c.id}" variant="story">{c.title}</Link>
					<p class="prompt">{excerpt(c.promptText, 140)}</p>
					<p class="meta">
						{#if status === 'upcoming'}
							{i === 0 ? 'Next in line' : c.startsAt ? `Starts ${formatDate(c.startsAt)}` : ''}
						{:else}
							{dates(c)} · {entries(c)}
						{/if}
						{#if c.source === 'ai'}<Badge>AI</Badge>{/if}
					</p>
				</div>
				<div class="actions">
					{#if status === 'open'}
						<form method="POST" action="?/close" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button class="close" type="submit">Close now</button>
						</form>
					{:else if status === 'closed'}
						<form method="POST" action="?/reopen" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<button class="close" type="submit">Reopen</button>
						</form>
					{/if}
					<details class="dates" open={datesError?.id === c.id || undefined}>
						<summary>Change dates</summary>
						<form method="POST" action="?/dates" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<label
								>Starts <input
									type="date"
									name="startsAt"
									value={c.startsAt ? toDateInput(c.startsAt) : ''}
									required
								/></label
							>
							<label
								>Ends <input
									type="date"
									name="endsAt"
									value={c.endsAt ? toDateInput(c.endsAt) : ''}
									required
								/></label
							>
							{#if datesError?.id === c.id}<p class="error" role="alert">
									{datesError.message}
								</p>{/if}
							<button class="confirm save" type="submit">Save dates</button>
						</form>
					</details>
					<details class="delete">
						<summary>Delete</summary>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="id" value={c.id} />
							<p>Stories written for it stay up.</p>
							<button class="confirm" type="submit">Delete “{c.title}”</button>
						</form>
					</details>
				</div>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet section(id: string, title: string, note: string)}
	<div class="head">
		<Heading level={2} size="lg" {id}>{title}</Heading>
		<span class="note">{note}</span>
	</div>
{/snippet}

<section class="manager" aria-label="Challenges">
	{#if message}<Notice tone="success">{message}</Notice>{/if}

	{#if page === 1}
		<section aria-labelledby="open-title">
			{@render section('open-title', 'Open now', 'Readers can enter this one.')}
			{#if open.length}{@render rows(open, 'open')}{:else}<p class="none">Nothing is open.</p>{/if}
		</section>
		{#if upcoming.length}
			<section aria-labelledby="upcoming-title">
				{@render section('upcoming-title', 'Coming up', 'Opens in this order.')}
				{@render rows(upcoming, 'upcoming')}
			</section>
		{/if}
	{/if}
	{#if closed.length}
		<section aria-labelledby="past-title">
			{@render section('past-title', 'Past', 'Closed, newest first.')}
			{@render rows(closed, 'closed', (page - 1) * 20 + 1)}
		</section>
	{/if}
	{#if url}<Pagination {page} {hasMore} {url} />{/if}
</section>

<style>
	.manager {
		display: grid;
		gap: var(--space-7);
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-3);
		padding-bottom: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.note,
	.none {
		color: var(--color-text-muted);
		font-style: italic;
	}

	.none {
		padding-block: var(--space-4);
	}

	/* Number, the challenge, then its actions; dashed rules between rows. */
	.row {
		display: grid;
		grid-template-columns: var(--space-8) minmax(0, 1fr) auto;
		gap: var(--space-4);
		align-items: start;
		padding-block: var(--space-5);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.n {
		color: var(--color-accent);
		font-size: var(--text-lg);
		font-weight: var(--weight-bold);
	}

	.what {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}

	.what :global(a) {
		font-size: var(--text-xl);
	}

	.prompt {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: flex-end;
		gap: var(--space-4);
	}

	.close {
		padding: var(--space-2) var(--space-4);
		border: var(--border-width) dashed var(--color-accent);
		background: transparent;
		color: var(--color-accent);
		font: inherit;
		font-style: italic;
		font-weight: var(--weight-bold);
		cursor: pointer;
	}

	.close:hover {
		background: var(--color-accent-soft);
	}

	.dates summary {
		padding-block: var(--space-2);
		color: var(--color-accent);
		font-style: italic;
		text-decoration: underline dashed;
		text-underline-offset: 0.3em;
		list-style: none;
		cursor: pointer;
	}

	.dates summary::-webkit-details-marker {
		display: none;
	}

	.dates form {
		display: grid;
		gap: var(--space-2);
		justify-items: end;
		margin-top: var(--space-2);
		font-size: var(--text-sm);
	}

	.dates label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text-muted);
	}

	.dates input {
		padding: var(--space-1) var(--space-2);
		border: var(--border-width) dashed var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
	}

	.error {
		color: var(--color-danger);
	}

	.save {
		background: var(--color-accent);
	}

	.delete summary {
		padding-block: var(--space-2);
		color: var(--color-danger);
		font-style: italic;
		text-decoration: underline dashed;
		text-underline-offset: 0.3em;
		list-style: none;
		cursor: pointer;
	}

	.delete summary::-webkit-details-marker {
		display: none;
	}

	.delete form {
		display: grid;
		gap: var(--space-2);
		justify-items: end;
		margin-top: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	.confirm {
		padding: var(--space-2) var(--space-3);
		border: 0;
		background: var(--color-danger);
		color: var(--color-bg);
		font: inherit;
		cursor: pointer;
	}

	@media (max-width: 40rem) {
		.row {
			grid-template-columns: var(--space-6) minmax(0, 1fr);
		}

		.actions {
			grid-column: 2;
		}
	}
</style>
