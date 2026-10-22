<script lang="ts">
	import { daysLeft, formatDate, timeLeft } from '#lib/format.ts';
	import type { ChallengeView } from '#lib/types.ts';
	import { Badge, Eyebrow, Heading, Icon, Link, VisuallyHidden } from '../../atoms/index.ts';

	interface Props {
		challenge: ChallengeView;
		/**
		 * page: the prompt as the hero · facts: the side column (countdown, facts, call to write)
		 * · banner: the Current challenge panel on the home page and beside the editor
		 */
		variant?: 'page' | 'facts' | 'banner';
		signedIn: boolean;
		appName?: string;
	}

	let { challenge, variant = 'page', signedIn, appName = 'MinnowPress' }: Props = $props();

	const open = $derived(challenge.isOpen ?? true);
	const writeHref = $derived(`/write?challenge=${challenge.id}`);
	const enterHref = $derived(signedIn ? writeHref : `/login?next=${encodeURIComponent(writeHref)}`);
	const days = $derived(open ? daysLeft(challenge.endsAt) : null);
</script>

{#if variant === 'banner'}
	<section class="banner" aria-labelledby="challenge-{challenge.id}-title">
		<div class="layout">
			{#if days !== null}
				<div class="ribbon" aria-hidden="true">
					{#if days === 0}<span class="unit">last day</span>{:else}<span class="days">{days}</span>
						<span class="unit">{days === 1 ? 'day left' : 'days left'}</span>{/if}
				</div>
			{/if}
			<div class="body">
				<Eyebrow tone="muted"
					>{open ? 'Current challenge' : 'Past challenge'}{#if challenge.endsAt && open}&nbsp;· Ends {formatDate(
							challenge.endsAt
						)}{/if}</Eyebrow
				>
				{#if days !== null}<VisuallyHidden>{timeLeft(challenge.endsAt)}</VisuallyHidden>{/if}
				<h2 id="challenge-{challenge.id}-title" class="banner-title">
					<a href="/challenges/{challenge.id}">{challenge.title}</a>
				</h2>
				<p class="prompt"><strong>Your prompt:</strong> {challenge.promptText}</p>
				<p class="links">
					{#if open}<Link href={enterHref}>Enter the challenge</Link> or{/if}
					<Link href="/challenges/{challenge.id}"
						>{open ? 'read the entries' : 'Read the entries'}</Link
					>
				</p>
			</div>
		</div>
	</section>
{:else if variant === 'page'}
	<!-- The prompt is the hero: a dashed box with a "challenge" ribbon on its corner. -->
	<section class="hero" aria-labelledby="challenge-{challenge.id}-title">
		<span class="flag">{challenge.upcoming ? 'coming up' : 'challenge'}</span>
		<div class="title">
			<Icon name="fish" filled />
			<Heading level={1} size="xl" id="challenge-{challenge.id}-title">{challenge.title}</Heading>
		</div>
		<p class="hero-prompt">{challenge.promptText}</p>
		{#if challenge.source === 'ai' || challenge.archiveUrl}
			<p class="tags">
				{#if challenge.source === 'ai'}<Badge>AI-suggested prompt</Badge>{/if}
				{#if challenge.archiveUrl}<Link href={challenge.archiveUrl} rel="noopener"
						>From the Ficly archive</Link
					>{/if}
			</p>
		{/if}
	</section>
{:else}
	<!-- The side column: countdown, the facts, and the call to write. -->
	<section class="side" aria-label="About this challenge">
		{#if days !== null}
			<p class="countdown">
				{#if days === 0}<span class="unit">last day</span>{:else}<strong>{days}</strong>
					<span class="unit">{days === 1 ? 'day left' : 'days left'}</span>{/if}
			</p>
		{:else if challenge.upcoming}
			<p class="countdown">
				<span class="closed"
					>Opens {challenge.startsAt ? formatDate(challenge.startsAt) : 'soon'}</span
				>
			</p>
		{:else if !open}
			<p class="countdown"><span class="closed">Closed</span></p>
		{/if}
		<dl class="table">
			{#if challenge.endsAt}<div>
					<dt>Deadline</dt>
					<dd><strong>{formatDate(challenge.endsAt)}</strong></dd>
				</div>{/if}
			{#if challenge.startsAt}<div>
					<dt>Started</dt>
					<dd>{formatDate(challenge.startsAt)}</dd>
				</div>{/if}
			<div>
				<dt>Created by</dt>
				<dd>
					{#if challenge.creator}<Link href="/@{challenge.creator.username}"
							>{challenge.creator.displayName}</Link
						>{:else if challenge.archiveUrl}a Ficly member{:else}{appName}{/if}
				</dd>
			</div>
			{#if challenge.entries !== undefined}<div>
					<dt>Entries</dt>
					<dd>{challenge.entries}</dd>
				</div>{/if}
		</dl>
		{#if !challenge.upcoming}
			<p>
				{open
					? 'Think you have what it takes? Write a story for this challenge.'
					: 'This one has closed, but it’s still taking stories. Write one for it.'}
			</p>
			<div><Link href={enterHref} variant="ribbon">participate!</Link></div>
		{/if}
	</section>
{/if}

<style>
	/* Current challenge: a bookmark ribbon with the days left, beside the prompt. */
	.banner {
		--ribbon-width: calc(var(--space-8) * 1.5);

		container-type: inline-size;
		border: var(--border-width) solid var(--color-border);
		background: var(--color-surface);
	}

	.layout {
		display: grid;
		grid-template-columns: var(--ribbon-width) minmax(0, 1fr);
		gap: var(--space-6);
		align-items: start;
		padding: var(--space-0) var(--space-6) var(--space-6);
	}

	.ribbon {
		position: relative;
		display: grid;
		justify-items: center;
		align-content: center;
		gap: var(--space-1);
		min-height: calc(var(--ribbon-width) * 1.45);
		padding: var(--space-5) var(--space-2) var(--space-7);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%);
	}

	.ribbon::before,
	.ribbon::after {
		content: '';
		position: absolute;
		top: var(--space-0);
		bottom: var(--space-5);
		border-left: var(--border-width) dashed var(--color-nav-underline);
	}

	.ribbon::before {
		left: var(--space-2);
	}

	.ribbon::after {
		right: var(--space-2);
	}

	.days {
		font-size: var(--text-3xl);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	.unit {
		font-size: var(--text-md);
		font-style: italic;
	}

	.body {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
		padding-top: var(--space-6);
	}

	.banner-title {
		font-size: var(--text-2xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
	}

	.banner-title a {
		color: var(--color-accent);
		text-decoration: none;
	}

	.banner-title a:hover {
		text-decoration: underline;
	}

	/* The prompt as written, wrapped: no clipping, and no word too long to wrap. */
	.prompt {
		max-width: var(--measure);
		font-size: var(--text-lg);
		line-height: var(--leading-prose);
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.prompt strong {
		color: var(--color-accent);
	}

	.links {
		font-size: var(--text-lg);
		font-style: italic;
	}

	.links :global(a) {
		text-decoration: underline;
	}

	/* Narrow spots (the editor sidebar, phones): ribbon above the text. */
	@container (max-width: 30rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-0);
			padding-inline: var(--space-5);
		}

		.ribbon {
			width: var(--ribbon-width);
			min-height: auto;
		}

		.body {
			padding-top: var(--space-4);
		}

		/* In a sidebar: regular-sized text. */
		.banner-title {
			font-size: var(--text-xl);
		}

		.prompt,
		.links {
			font-size: var(--text-md);
		}
	}

	.hero {
		position: relative;
		display: grid;
		gap: var(--space-5);
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

	.title {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		color: var(--color-accent);
	}

	.title :global(h1) {
		font-size: var(--text-story-title);
	}

	.title :global(.icon) {
		flex: none;
		width: var(--size-face-lg);
		height: var(--size-face-lg);
	}

	.hero-prompt {
		max-width: var(--measure);
		font-size: var(--text-xl);
		font-style: italic;
		line-height: var(--leading-prose);
		white-space: pre-line;
		overflow-wrap: anywhere;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.side {
		display: grid;
		gap: var(--space-5);
		align-content: start;
	}

	.countdown {
		display: grid;
	}

	.countdown strong {
		color: var(--color-accent);
		font-size: var(--text-hero);
		line-height: var(--leading-tight);
	}

	.countdown .unit {
		font-size: var(--text-lg);
	}

	.closed {
		color: var(--color-text-muted);
		font-size: var(--text-2xl);
		font-style: italic;
	}

	/* The facts: small-caps labels on the left, values on the right, dashed rules between. */
	.table {
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.table div {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-3);
		padding-block: var(--space-3);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	dt {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-bold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	dd :global(a) {
		font-style: italic;
		text-decoration: underline;
	}
</style>
