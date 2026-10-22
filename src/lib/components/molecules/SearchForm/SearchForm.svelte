<script lang="ts">
	import { TextInput, VisuallyHidden } from '../../atoms/index.ts';

	interface Props {
		value?: string;
		id?: string;
		placeholder?: string;
	}

	let { value = '', id = 'site-search', placeholder = 'Search…' }: Props = $props();
</script>

<form class="search" role="search" method="GET" action="/search">
	<label for={id}><VisuallyHidden>Search</VisuallyHidden></label>
	<TextInput {id} type="search" name="q" {value} {placeholder} minlength={2} maxlength={100} />
	<button type="submit">search</button>
</form>

<style>
	.search {
		display: flex;
		min-width: 12rem;
		max-width: 22rem;
	}

	.search :global(input) {
		border: 0;
		border-radius: var(--space-0);
		font-style: italic;
	}

	button {
		padding: var(--space-2) var(--space-4);
		border: 0;
		background: var(--color-ink-button);
		color: var(--color-nav-text);
		font: inherit;
		font-style: italic;
		font-weight: var(--weight-bold);
		cursor: pointer;
	}
</style>
