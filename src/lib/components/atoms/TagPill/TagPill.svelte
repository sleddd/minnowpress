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
	/* A luggage tag: pointed left end with a punched hole, italic lowercase name. */
	.tag {
		--point: 0.75em;
		--pad-start: calc(var(--point) + var(--space-3));

		position: relative;
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

	.tag::before {
		content: '';
		position: absolute;
		top: 50%;
		left: calc(var(--point) + var(--space-1));
		width: var(--space-1);
		height: var(--space-1);
		border-radius: var(--radius-full);
		background: var(--color-bg);
		transform: translateY(-50%);
	}

	.tag:hover {
		background: var(--color-nav-underline);
	}

	.count {
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-style: normal;
	}
</style>
