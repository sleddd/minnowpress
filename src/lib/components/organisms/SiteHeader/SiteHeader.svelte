<script lang="ts">
	import type { Theme } from '#lib/theme.ts';
	import type { Viewer } from '#lib/types.ts';
	import { Button, Link, Logo } from '../../atoms/index.ts';
	import { ThemeToggle } from '../../molecules/index.ts';

	interface Props {
		appName: string;
		viewer: Viewer | null;
		path: string;
		/** For the sun that flips light and dark, top right (in the ribbon on phones). */
		theme?: Theme;
	}

	let { appName, viewer, path, theme = 'light' }: Props = $props();

	const isMod = $derived(viewer?.role === 'mod' || viewer?.role === 'admin');
</script>

<header class="masthead">
	<a class="brand" href="/">
		<Logo name={appName} tagline="Little stories, endless sequels." />
	</a>
	<div class="end">
		<nav class="utility" aria-label="Account">
			<ul role="list">
				{#if viewer}
					<li>
						<span class="muted">Signed in as:</span>
						<Link href="/@{viewer.username}"><em>{viewer.displayName}</em></Link>
					</li>
					<li><Link href="/desk" variant="subtle" current={path === '/desk'}>Your desk</Link></li>
					{#if isMod}<li>
							<Link href="/admin" variant="subtle" current={path.startsWith('/admin')}>Admin</Link>
						</li>{/if}
					<li>
						<form method="POST" action="/logout">
							<Button type="submit" variant="ghost" size="sm">Sign out</Button>
						</form>
					</li>
				{:else}
					<li><Link href="/login" variant="subtle">Sign in</Link></li>
					<li><Link href="/login" variant="subtle">Join us</Link></li>
					<li>
						<Link href="/about" variant="subtle" current={path === '/about'}
							>What is {appName}?</Link
						>
					</li>
				{/if}
				<li><Link href="/blog" variant="subtle" current={path.startsWith('/blog')}>Blog</Link></li>
				<li><Link href="/help" variant="subtle" current={path === '/help'}>Help</Link></li>
			</ul>
		</nav>
		<ThemeToggle {theme} {path} />
	</div>
</header>

<style>
	.masthead {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4) var(--space-6);
		padding-top: var(--space-5);
	}

	.brand {
		color: inherit;
		text-decoration: none;
	}

	.end {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-left: auto;
	}

	.utility ul {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
	}

	.utility li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding-inline: var(--space-3);
		border-left: var(--border-width) solid var(--color-border-strong);
		line-height: var(--leading-tight);
	}

	.utility li:first-child {
		border-left: 0;
	}

	.utility :global(button) {
		padding: var(--space-0);
		font-size: inherit;
		color: inherit;
	}

	.muted {
		color: var(--color-text-muted);
	}

	@media (max-width: 52rem) {
		.utility li:first-child {
			padding-left: var(--space-0);
		}
	}

	/* On phones the ribbon carries the wordmark, the sun and the menu instead. */
	@media (max-width: 48rem) {
		.masthead {
			display: none;
		}
	}
</style>
