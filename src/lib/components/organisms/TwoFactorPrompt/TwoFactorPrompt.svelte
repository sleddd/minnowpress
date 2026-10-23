<script lang="ts">
	import { Button, Heading, Text } from '../../atoms/index.ts';
	import { FormField } from '../../molecules/index.ts';

	interface Props {
		/** Where to go once the code checks out. */
		next: string;
		error?: string | null;
	}

	let { next, error = null }: Props = $props();
</script>

<form class="two-factor" method="POST">
	<Heading level={1} size="lg">Two-step sign-in</Heading>
	<Text>Enter the 6-digit code from your authenticator app to unlock your staff tools.</Text>
	<FormField
		id="code"
		name="code"
		label="Code"
		hint="Lost your phone? Enter one of your recovery codes instead."
		autocomplete="one-time-code"
		maxlength={20}
		required
		{error}
	/>
	<input type="hidden" name="next" value={next} />
	<div><Button type="submit">Unlock</Button></div>
</form>

<style>
	.two-factor {
		display: grid;
		gap: var(--space-4);
		max-width: 28rem;
	}
</style>
