<script lang="ts">
	import { Link, Text } from '../../atoms/index.ts';

	interface Props {
		credit: { url: string; author: string; authorUrl: string | null };
		/** compact: "By X on Ficly" · full: adds license and original link · license: no author (byline shows it) */
		variant?: 'compact' | 'full' | 'license';
	}

	let { credit, variant = 'compact' }: Props = $props();
</script>

<Text as="span" size="sm" tone="muted">
	{#if variant === 'license'}
		Originally published on Ficly, shared under
		<Link href="https://creativecommons.org/licenses/by-sa/3.0/" rel="license noopener"
			>CC BY-SA 3.0</Link
		>
		· <Link href={credit.url} rel="noopener">Read the original</Link>
	{:else}
		By
		{#if credit.authorUrl}<Link href={credit.authorUrl} rel="noopener">{credit.author}</Link
			>{:else}{credit.author}{/if}
		on Ficly{#if variant === 'full'}, shared under
			<Link href="https://creativecommons.org/licenses/by-sa/3.0/" rel="license noopener"
				>CC BY-SA 3.0</Link
			>
			· <Link href={credit.url} rel="noopener">Read the original</Link>{/if}
	{/if}
</Text>
