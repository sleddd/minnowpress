<script lang="ts">
	import { tick } from 'svelte';
	import type { Theme } from '#lib/theme.ts';
	import { Icon } from '../../atoms/index.ts';

	interface Props {
		/** The saved theme; "auto" follows the system until the sun is clicked. */
		theme: Theme;
		/** The current page, to come back to when scripts are off. */
		path: string;
	}

	let { theme, path }: Props = $props();

	// What's showing now: the theme picked here, else the saved one, reading the system for "auto".
	let picked = $state<Theme | null>(null);
	let systemDark = $state(false);
	$effect(() => {
		const query = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = query.matches;
		const follow = (e: MediaQueryListEvent) => (systemDark = e.matches);
		query.addEventListener('change', follow);
		return () => query.removeEventListener('change', follow);
	});
	const current = $derived(picked ?? theme);
	const dark = $derived(current === 'dark' || (current === 'auto' && systemDark));
	const target = $derived(dark ? 'light' : 'dark');

	let button: HTMLButtonElement;

	/**
	 * The new theme spreads out from the sun in a growing circle, where the browser can do view
	 * transitions and the reader hasn't asked for less motion; otherwise it switches at once.
	 */
	async function flip(next: Theme) {
		const apply = async () => {
			picked = next;
			document.documentElement.dataset.theme = next;
			await tick();
		};
		const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (still || !document.startViewTransition) return apply();
		const box = button.getBoundingClientRect();
		const x = box.left + box.width / 2;
		const y = box.top + box.height / 2;
		const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
		const transition = document.startViewTransition(apply);
		await transition.ready;
		document.documentElement.animate(
			{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${reach}px at ${x}px ${y}px)`] },
			{ duration: 550, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
		);
	}

	// Flip the page at once and save in the background; without scripts the form posts instead.
	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		const next = target;
		await flip(next);
		const body = new FormData();
		body.set('theme', next);
		await fetch('/theme', { method: 'POST', body, headers: { accept: 'application/json' } });
	}
</script>

<form class="theme-toggle" method="POST" action="/theme" {onsubmit}>
	<input type="hidden" name="theme" value={target} />
	<input type="hidden" name="next" value={path} />
	<button
		bind:this={button}
		type="submit"
		aria-label={dark ? 'Turn the lights on (light theme)' : 'Turn the lights off (dark theme)'}
		title={dark ? 'Light theme' : 'Dark theme'}
	>
		<Icon name="sun" filled={!dark} />
	</button>
</form>

<style>
	.theme-toggle {
		display: inline-flex;
	}

	button {
		display: inline-flex;
		padding: var(--space-1);
		border: 0;
		border-radius: var(--radius-full);
		background: none;
		color: inherit;
		cursor: pointer;
	}

	button :global(.icon) {
		width: var(--space-6);
		height: var(--space-6);
	}

	button:hover {
		color: var(--color-accent);
	}
</style>
