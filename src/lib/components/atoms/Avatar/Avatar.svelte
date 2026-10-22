<script lang="ts">
	import { avatarTone } from '#lib/avatar.ts';

	interface Props {
		/** Picks the placeholder's color; never shown. */
		name: string;
		/** A real photo, when we ever host them. Until then a silhouette is drawn. */
		src?: string | null;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		shape?: 'round' | 'square';
	}

	let { name, src = null, size = 'md', shape = 'round' }: Props = $props();

	const tone = $derived(avatarTone(name));
</script>

{#if src}
	<img class="avatar {size} {shape}" {src} alt="" loading="lazy" />
{:else}
	<svg
		class="avatar placeholder tone-{tone} {size} {shape}"
		viewBox="0 0 40 40"
		aria-hidden="true"
		focusable="false"
	>
		<rect class="bg" width="40" height="40" />
		<circle class="fg" cx="20" cy="15.5" r="7.5" />
		<path class="fg" d="M6 40c0-8.6 6.3-14.5 14-14.5S34 31.4 34 40z" />
	</svg>
{/if}

<style>
	.avatar {
		display: block;
		flex: none;
		object-fit: cover;
		overflow: hidden;
	}

	.round {
		border-radius: var(--radius-full);
	}

	.square {
		border-radius: var(--radius-sm);
	}

	.sm {
		width: var(--size-face-sm);
		height: var(--size-face-sm);
	}

	.md {
		width: var(--size-face-md);
		height: var(--size-face-md);
	}

	.lg {
		width: var(--size-face-lg);
		height: var(--size-face-lg);
	}

	.xl {
		width: var(--size-face-xl);
		height: var(--size-face-xl);
	}

	.tone-1 {
		--avatar-bg: var(--color-avatar-1-bg);
		--avatar-fg: var(--color-avatar-1-fg);
	}

	.tone-2 {
		--avatar-bg: var(--color-avatar-2-bg);
		--avatar-fg: var(--color-avatar-2-fg);
	}

	.tone-3 {
		--avatar-bg: var(--color-avatar-3-bg);
		--avatar-fg: var(--color-avatar-3-fg);
	}

	.tone-4 {
		--avatar-bg: var(--color-avatar-4-bg);
		--avatar-fg: var(--color-avatar-4-fg);
	}

	.tone-5 {
		--avatar-bg: var(--color-avatar-5-bg);
		--avatar-fg: var(--color-avatar-5-fg);
	}

	.tone-6 {
		--avatar-bg: var(--color-avatar-6-bg);
		--avatar-fg: var(--color-avatar-6-fg);
	}

	.bg {
		fill: var(--avatar-bg);
	}

	.fg {
		fill: var(--avatar-fg);
	}
</style>
