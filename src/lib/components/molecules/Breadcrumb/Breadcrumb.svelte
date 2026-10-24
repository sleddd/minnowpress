<script lang="ts">
	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		label?: string;
		/** The current item is marked; items without an href are plain text. */
		items: Crumb[];
		current?: number;
	}

	let { label = 'Breadcrumb', items, current = -1 }: Props = $props();
</script>

{#if items.length > 1}
	<nav class="crumbs" aria-label={label}>
		<ol role="list">
			{#each items as item, i (i)}
				<li>
					{#if i > 0}<span class="arrow" aria-hidden="true">→</span>{/if}
					{#if item.href && i !== current}
						<a href={item.href}>{item.label}</a>
					{:else}
						<span class:current={i === current} aria-current={i === current ? 'page' : undefined}
							>{item.label}</span
						>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	ol {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		color: var(--color-text-muted);
		font-size: var(--text-md);
	}

	li {
		display: inline-flex;
		gap: var(--space-2);
	}

	a {
		color: var(--color-accent);
		text-decoration: none;
	}

	.current {
		color: var(--color-text);
		font-weight: var(--weight-semibold);
	}
</style>
