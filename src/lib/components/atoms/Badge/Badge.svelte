<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'neutral' | 'accent' | 'warning' | 'success';
		/** pill: small caps (the default) · ribbon: solid, notched on the right · tag: notched on the left */
		shape?: 'pill' | 'ribbon' | 'tag';
		children: Snippet;
	}

	let { tone = 'neutral', shape = 'pill', children }: Props = $props();
</script>

<span class="badge {tone} {shape}">{@render children()}</span>

<style>
	.badge {
		display: inline-block;
		padding: var(--space-0) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		font-weight: var(--weight-medium);
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.ribbon,
	.tag {
		--notch: var(--space-2);

		border-radius: var(--space-0);
		font-style: italic;
		letter-spacing: normal;
		text-transform: none;
	}

	.ribbon {
		--pad-end: calc(var(--notch) + var(--space-2));

		padding-inline-end: var(--pad-end);
		font-weight: var(--weight-bold);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.ribbon.accent {
		background: var(--color-accent);
		color: var(--color-accent-contrast);
	}

	.tag {
		--pad-start: calc(var(--notch) + var(--space-2));

		padding-inline-start: var(--pad-start);
		clip-path: polygon(var(--notch) 0, 100% 0, 100% 100%, var(--notch) 100%, 0 50%);
	}

	.neutral {
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
	}

	.accent {
		background: var(--color-accent-soft);
		color: var(--color-accent);
	}

	.warning {
		background: var(--color-warning-soft);
		color: var(--color-warning);
	}

	.success {
		background: var(--color-success-soft);
		color: var(--color-success);
	}
</style>
