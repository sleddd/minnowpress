<script lang="ts">
	import { Eyebrow, Heading, Link } from '../../atoms/index.ts';

	interface Props {
		/** Who's signed in, e.g. "theminnow". */
		name: string;
	}

	let { name }: Props = $props();
</script>

<header class="desk-header">
	<div class="title">
		<Eyebrow tone="muted">Signed in as {name}</Eyebrow>
		<Heading level={1} size="xl">Your stories</Heading>
	</div>
	<Link href="/write" variant="ribbon">write a new story</Link>
</header>

<style>
	.desk-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.title {
		display: grid;
		gap: var(--space-1);
	}

	.title :global(h1) {
		font-size: var(--text-story-title);
	}
</style>
