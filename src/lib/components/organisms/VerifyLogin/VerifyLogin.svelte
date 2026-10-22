<script lang="ts">
	import { Button, Heading, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
		token: string;
		next: string;
	}

	let { appName, token, next }: Props = $props();
</script>

<form class="verify" method="POST">
	<Heading level={1} size="lg">Sign in to {appName}</Heading>
	<Text tone="muted">Press the button to finish signing in on this device.</Text>
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
