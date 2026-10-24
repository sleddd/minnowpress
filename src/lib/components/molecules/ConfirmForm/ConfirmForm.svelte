<script lang="ts">
	import { Button, Text } from '../../atoms/index.ts';

	interface Props {
		/** What opens the form, e.g. "Remove challenge (moderator)". */
		label: string;
		/** What happens, said before the reader confirms. */
		message: string;
		action: string;
		/** The button that does it. */
		confirm: string;
	}

	let { label, message, action, confirm }: Props = $props();
</script>

<!-- A destructive action behind a fold, so it takes two deliberate clicks. -->
<details class="confirm">
	<summary>{label}</summary>
	<form method="POST" {action}>
		<Text size="sm">{message}</Text>
		<div><Button type="submit" variant="dashed-danger" size="sm">{confirm}</Button></div>
	</form>
</details>

<style>
	summary {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		font-style: italic;
		cursor: pointer;
	}

	form {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}
</style>
