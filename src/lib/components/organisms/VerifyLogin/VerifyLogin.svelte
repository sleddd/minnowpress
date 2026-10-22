<script lang="ts">
	import { Button, Heading, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
		token: string;
		/** The account the link signs in to. */
		email: string;
		next: string;
	}

	let { appName, token, email, next }: Props = $props();
</script>

<form class="verify" method="POST">
	<Heading level={1} size="lg">Sign in to {appName}</Heading>
	<Text>You’re signing in as <strong>{email}</strong>.</Text>
	<Text tone="muted"
		>Press the button to finish signing in on this device. If that isn’t your email, close this
		page.</Text
	>
	<input type="hidden" name="token" value={token} />
	<input type="hidden" name="next" value={next} />
	<div><Button type="submit">Continue</Button></div>
</form>

<style>
	.verify {
		display: grid;
		gap: var(--space-4);
	}
</style>
