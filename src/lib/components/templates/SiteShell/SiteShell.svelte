<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Link } from '../../atoms/index.ts';

	interface Props {
		/** Logo and account links, on the frame above the card. */
		masthead: Snippet;
		/** Optional statement between the masthead and the card (the home page headline). */
		banner?: Snippet;
		/** The ribbon nav across the top of the card. */
		ribbon: Snippet;
		footer: Snippet;
		children: Snippet;
	}

	let { masthead, banner, ribbon, footer, children }: Props = $props();
</script>

<div class="frame">
	<div class="skip"><Link href="#main">Skip to content</Link></div>
	<div class="masthead">{@render masthead()}</div>
	{#if banner}<div class="banner">{@render banner()}</div>{/if}
	<div class="card">
		{@render ribbon()}
		<main id="main" class="main" tabindex="-1">{@render children()}</main>
	</div>
	<div class="footer">{@render footer()}</div>
</div>

<style>
	.frame {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
		max-width: calc(var(--page-width) + var(--space-8) * 2);
		min-height: 100vh;
		margin-inline: auto;
		padding: var(--space-0) var(--space-6) var(--space-6);
	}

	.masthead,
	.banner,
	.footer {
		padding-inline: var(--space-4);
	}

	.card {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-6);
		padding-top: var(--space-6);
		background: var(--color-bg);
		box-shadow: var(--shadow-page);
	}

	.main {
		width: 100%;
		padding: var(--space-4) var(--space-8) var(--space-8);
	}

	.main:focus {
		box-shadow: none;
	}

	.skip {
		position: absolute;
		top: var(--space-2);
		left: var(--space-2);
		z-index: 20;
		padding: var(--space-2);
		background: var(--color-bg);
		transform: translateY(-200%);
	}

	.skip:focus-within {
		transform: none;
	}

	@media (max-width: 52rem) {
		.frame {
			gap: var(--space-4);
			padding: var(--space-0) var(--space-0) var(--space-5);
		}

		.card {
			padding-top: var(--space-0);
			box-shadow: none;
		}

		.main {
			padding: var(--space-5) var(--space-5) var(--space-7);
		}
	}
</style>
