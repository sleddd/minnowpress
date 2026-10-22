<script lang="ts">
	import { Icon, Link } from '../../atoms/index.ts';

	interface Props {
		page: number;
		hasMore: boolean;
		/** Current URL; other query params are kept. */
		url: { href: string };
	}

	let { page, hasMore, url }: Props = $props();

	function hrefFor(target: number) {
		const next = new URL(url.href);
		if (target <= 1) next.searchParams.delete('page');
		else next.searchParams.set('page', String(target));
		return next.pathname + next.search;
	}
</script>

{#if page > 1 || hasMore}
	<nav class="pagination" aria-label="Pages">
		{#if page > 1}
			<Link href={hrefFor(page - 1)} rel="prev"><Icon name="arrow-left" /> Newer</Link>
		{:else}
			<span></span>
		{/if}
		{#if hasMore}
			<Link href={hrefFor(page + 1)} rel="next">Older <Icon name="arrow-right" /></Link>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		justify-content: space-between;
		padding-block: var(--space-4);
	}
</style>
