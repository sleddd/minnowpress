<script lang="ts">
	interface Props {
		tag: string;
		/** Optional story count, shown on the tags index. */
		count?: number | null;
	}

	let { tag, count = null }: Props = $props();
</script>

<a class="tag" href="/tags/{encodeURIComponent(tag)}"
	>{tag}{#if count !== null}<span class="count">{count}</span>{/if}</a
>

<style>
	/* A luggage tag: pointed left end, italic lowercase name. */
	.tag {
		--point: 0.75em;
		--pad-start: calc(var(--point) + var(--space-3));

		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3) var(--space-1) var(--pad-start);
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-size: var(--text-md);
		font-style: italic;
		text-decoration: none;
		clip-path: polygon(var(--point) 0, 100% 0, 100% 100%, var(--point) 100%, 0 50%);
	}

	/* Hover flips the colors, so the name stays readable in both themes. */
	.tag:hover {
		background: var(--color-accent);
		color: var(--color-bg);
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-style: normal;
	}

	.tag:hover .count {
		color: inherit;
	}
</style>
