<script lang="ts">
	interface Props {
		/** The site name, split as "minnow" + italic "press" when it ends with "press". */
		name: string;
		size?: 'sm' | 'lg';
		/** Small caps line under the wordmark. */
		tagline?: string | null;
	}

	let { name, size = 'lg', tagline = null }: Props = $props();

	const split = $derived(/press$/i.test(name) && name.length > 5);
	const head = $derived(split ? name.slice(0, -5) : name);
	const tail = $derived(split ? name.slice(-5) : '');
</script>

<span class="logo {size}">
	<span class="text">
		<span class="word">{head.toLowerCase()}<em>{tail.toLowerCase()}</em></span>
		{#if tagline}<span class="tagline">{tagline}</span>{/if}
	</span>
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: flex-start;
		gap: var(--space-4);
		color: var(--color-text);
	}

	.text {
		display: grid;
		gap: var(--space-1);
	}

	.tagline {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: var(--weight-semibold);
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
	}

	.word {
		font-family: var(--font-serif);
		font-size: var(--text-3xl);
		font-weight: var(--weight-bold);
		line-height: var(--leading-tight);
		letter-spacing: -0.02em;
	}

	.word em {
		color: var(--color-accent);
		font-weight: var(--weight-normal);
	}

	.sm {
		align-items: center;
		gap: var(--space-2);
	}

	.sm .word {
		font-size: var(--text-xl);
	}
</style>
