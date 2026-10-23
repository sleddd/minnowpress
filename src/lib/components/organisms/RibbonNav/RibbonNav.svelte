<script lang="ts">
	import type { Theme } from '#lib/theme.ts';
	import type { Viewer } from '#lib/types.ts';
	import { Icon } from '../../atoms/index.ts';
	import { SearchForm, ThemeToggle } from '../../molecules/index.ts';

	interface Props {
		path: string;
		/** The current search, kept in the box on the results page. */
		query?: string;
		/** For the account links in the phone menu (the masthead shows them on wider screens). */
		viewer?: Viewer | null;
		appName?: string;
		/** For the sun that flips light and dark; it stays in the ribbon on every screen. */
		theme?: Theme;
	}

	let {
		path,
		query = '',
		viewer = null,
		appName = 'MinnowPress',
		theme = 'light'
	}: Props = $props();

	const isMod = $derived(viewer?.role === 'mod' || viewer?.role === 'admin');

	// The phone menu closes itself after a link takes you somewhere.
	let open = $state(false);
	$effect(() => {
		void path;
		open = false;
	});

	const sections = [
		{ href: '/desk', label: 'your stories', match: /^\/(desk|@)/ },
		{ href: '/write', label: 'write', match: /^\/write(\/|$)/ },
		{ href: '/tags', label: 'tags', match: /^\/tags(\/|$)/ },
		{ href: '/challenges', label: 'challenges', match: /^\/challenges(\/|$)/ },
		{ href: '/browse', label: 'browse', match: /^\/(browse|stories|s|chain|authors|search)(\/|$)/ }
	];
</script>

<div class="wrap">
	<nav class="ribbon" aria-label="Main">
		<a class="home" href="/" aria-label="Home"><Icon name="fish" filled /></a>
		<ul role="list">
			{#each sections as section (section.href)}
				<li>
					<a href={section.href} aria-current={section.match.test(path) ? 'page' : undefined}
						>{section.label}</a
					>
				</li>
			{/each}
		</ul>
		<div class="search"><SearchForm id="ribbon-search" value={query} /></div>
		<div class="lights"><ThemeToggle {theme} {path} /></div>
	</nav>

	<!-- Phones: the sections, search, and account links fold into a menu under the ribbon. -->
	<details class="menu" bind:open>
		<summary aria-label="Menu">
			<span class="when-closed" aria-hidden="true">menu</span><span
				class="when-open"
				aria-hidden="true">close</span
			>
			<Icon name="menu" />
		</summary>
		<div class="panel">
			<SearchForm id="menu-search" value={query} />
			<ul class="menu-links" role="list">
				{#each sections as section (section.href)}
					<li>
						<a href={section.href} aria-current={section.match.test(path) ? 'page' : undefined}
							>{section.label} <Icon name="arrow-right" /></a
						>
					</li>
				{/each}
			</ul>
			<div class="account">
				{#if viewer}
					<p>Signed in as <a class="me" href="/@{viewer.username}">{viewer.displayName}</a></p>
					<ul role="list">
						<li><a href="/desk">Your desk</a></li>
						{#if isMod}<li><a href="/admin">Admin</a></li>{/if}
						<li><a href="/blog">Blog</a></li>
						<li><a href="/help">Help</a></li>
						<li>
							<form method="POST" action="/logout"><button type="submit">Sign out</button></form>
						</li>
					</ul>
				{:else}
					<ul role="list">
						<li><a href="/login">Sign in</a></li>
						<li><a href="/login">Join us</a></li>
						<li><a href="/about">What is {appName}?</a></li>
						<li><a href="/blog">Blog</a></li>
						<li><a href="/help">Help</a></li>
					</ul>
				{/if}
			</div>
		</div>
	</details>
</div>

<style>
	.ribbon {
		--overhang: calc(var(--space-4) * -1);

		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-5);
		margin-inline: var(--overhang) var(--short);
		padding: var(--space-4) var(--pad-end) var(--space-4) var(--space-7);
		background: var(--color-nav);
		color: var(--color-nav-text);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.ribbon::before,
	.ribbon::after {
		content: '';
		position: absolute;
		left: var(--space-0);
		right: var(--space-0);
		border-top: 2px dashed var(--color-nav-underline);
		opacity: 0.6;
	}

	.ribbon::before {
		top: var(--space-2);
	}

	.ribbon::after {
		bottom: var(--space-2);
	}

	.home {
		display: inline-flex;
		color: var(--color-nav-text);
	}

	.home :global(.icon) {
		width: var(--size-avatar-md);
		height: var(--size-avatar-md);
	}

	.lights {
		display: flex;
		color: var(--color-nav-text);
	}

	.wrap {
		--notch: var(--space-6);
		--pad-end: calc(var(--notch) + var(--space-5));

		/* Room the phone menu's "menu ≡" takes at the right of the ribbon. */
		--menu-width: 6.5rem;
		--phone-pad-end: calc(var(--pad-end) + var(--menu-width));

		/* The ribbon stops just short of the card's right edge. */
		--short: var(--space-6);
		--menu-right: calc(var(--pad-end) + var(--short));

		position: relative;
	}

	.ribbon ul {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-5);
	}

	.ribbon ul a {
		color: var(--color-nav-text);
		font-size: var(--text-xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		text-decoration: none;
		white-space: nowrap;
	}

	.ribbon ul a:hover,
	.ribbon ul a[aria-current='page'] {
		box-shadow: inset 0 -3px 0 var(--color-nav-underline);
	}

	/* Mid-size screens: tighten the links so they stay on one line beside the search. */
	@media (max-width: 72rem) {
		.ribbon ul {
			gap: var(--space-1) var(--space-4);
		}

		.ribbon ul a {
			font-size: var(--text-lg);
		}

		.search :global(.search) {
			min-width: 0;
			max-width: 14rem;
		}
	}

	@media (max-width: 60rem) {
		.ribbon {
			flex-wrap: wrap;
			gap: var(--space-3);
			margin-inline: var(--space-0) var(--short);
			padding: var(--space-4);
			clip-path: none;
		}

		.ribbon ul {
			min-width: 0;
			gap: var(--space-1) var(--space-4);
		}

		.ribbon ul a {
			font-size: var(--text-lg);
		}

		.lights {
			margin-left: auto;
		}

		/* The search drops to its own row; the sun stays up top on the right. */
		.search {
			flex-basis: 100%;
			order: 1;
		}

		.search :global(.search) {
			max-width: none;
		}
	}

	/* The phone menu: hidden on wider screens. */
	.menu {
		display: none;
	}

	@media (max-width: 48rem) {
		.wrap {
			--short: var(--space-5);
		}

		.ribbon {
			min-height: calc(var(--space-8) + var(--space-2));
			padding-right: var(--phone-pad-end);
			clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
		}

		.ribbon ul,
		.ribbon .search {
			display: none;
		}

		.menu {
			display: block;
		}

		summary {
			position: absolute;
			top: var(--space-0);
			right: var(--menu-right);
			display: flex;
			align-items: center;
			gap: var(--space-2);
			height: calc(var(--space-8) + var(--space-2));
			color: var(--color-nav-text);
			font-size: var(--text-xl);
			font-style: italic;
			font-weight: var(--weight-bold);
			list-style: none;
			cursor: pointer;
		}

		summary::-webkit-details-marker {
			display: none;
		}

		.when-open,
		.menu[open] .when-closed {
			display: none;
		}

		.menu[open] .when-open {
			display: inline;
		}

		.panel {
			display: grid;
			gap: var(--space-5);
			padding: var(--space-5);
		}

		.menu-links li {
			border-bottom: var(--border-width) dashed var(--color-border-strong);
		}

		.menu-links li:first-child {
			border-top: var(--border-width) dashed var(--color-border-strong);
		}

		.menu-links a {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-block: var(--space-3);
			color: var(--color-text);
			font-size: var(--text-2xl);
			font-style: italic;
			font-weight: var(--weight-bold);
			text-decoration: none;
		}

		.menu-links a[aria-current='page'] {
			color: var(--color-accent);
		}

		.menu-links :global(.icon) {
			color: var(--color-text-muted);
		}

		.account {
			display: grid;
			gap: var(--space-3);
			color: var(--color-text-muted);
		}

		.me {
			color: var(--color-accent);
			font-style: italic;
		}

		.account ul {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: var(--space-3);
		}

		.account ul a,
		.account button {
			padding: var(--space-0);
			border: 0;
			background: none;
			color: var(--color-text);
			font: inherit;
			font-size: var(--text-lg);
			text-decoration: none;
			cursor: pointer;
		}
	}
</style>
