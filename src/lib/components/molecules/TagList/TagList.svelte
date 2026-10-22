<script lang="ts">
	import { TagPill } from '../../atoms/index.ts';

	interface Props {
		tags: string[];
	}

	let { tags }: Props = $props();
</script>

{#if tags.length}
	<ul class="tags" role="list" aria-label="Tags">
		{#each tags as tag (tag)}
			<li><TagPill {tag} /></li>
		{/each}
	</ul>
{/if}

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-2);
	}
</style>
