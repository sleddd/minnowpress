<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		/**
		 * primary: solid teal · secondary: teal outline · cta: light teal · ghost · danger ·
		 * ribbon: solid teal with a notched end, for a form's main action · dashed: teal dashed
		 * outline · dashed-danger: the same in red, for turning something off
		 */
		variant?:
			'primary' | 'secondary' | 'cta' | 'ghost' | 'danger' | 'ribbon' | 'dashed' | 'dashed-danger';
		size?: 'sm' | 'md';
		/** Stretch to the container's width. */
		block?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		block = false,
		type = 'button',
		children,
		...rest
	}: Props = $props();
</script>

<button class="button {variant} {size}" class:block {type} {...rest}>{@render children()}</button>

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		font: inherit;
		font-weight: var(--weight-semibold);
		line-height: var(--leading-tight);
		cursor: pointer;
		transition:
			background-color var(--duration-fast),
			border-color var(--duration-fast),
			color var(--duration-fast);
	}

	.md {
		padding: var(--space-3) var(--space-5);
		font-size: var(--text-md);
	}

	.sm {
		padding: var(--space-1) var(--space-3);
		font-size: var(--text-sm);
	}

	.block {
		width: 100%;
	}

	.primary {
		background: var(--color-accent);
		color: var(--color-accent-contrast);
	}

	.primary:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}

	.secondary {
		background: var(--color-surface);
		border-color: var(--color-accent);
		color: var(--color-accent);
		font-weight: var(--weight-normal);
	}

	.secondary:hover:not(:disabled) {
		background: var(--color-accent-soft);
	}

	.cta {
		background: var(--color-cta);
		color: var(--color-accent-contrast);
	}

	.cta:hover:not(:disabled) {
		background: var(--color-cta-hover);
	}

	.ghost {
		background: transparent;
		color: var(--color-text-muted);
		font-weight: var(--weight-normal);
	}

	.ghost:hover:not(:disabled) {
		color: var(--color-text);
		background: var(--color-surface-sunken);
	}

	.danger {
		background: var(--color-danger);
		color: var(--color-accent-contrast);
	}

	.ribbon,
	.dashed,
	.dashed-danger {
		border-radius: var(--space-0);
		font-style: italic;
		font-weight: var(--weight-bold);
	}

	.ribbon {
		--notch: var(--space-4);
		--pad-end: calc(var(--notch) + var(--space-5));

		padding-inline-end: var(--pad-end);
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font-size: var(--text-lg);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.ribbon:hover:not(:disabled) {
		background: var(--color-accent-hover);
	}

	.dashed {
		border: var(--border-width) dashed var(--color-accent);
		background: transparent;
		color: var(--color-accent);
	}

	.dashed:hover:not(:disabled) {
		background: var(--color-accent-soft);
	}

	.dashed-danger {
		border: var(--border-width) dashed var(--color-danger);
		background: transparent;
		color: var(--color-danger);
	}

	.dashed-danger:hover:not(:disabled) {
		background: var(--color-danger-soft);
	}

	.button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
