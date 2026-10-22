<script lang="ts">
	import { Eyebrow, Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
		signedIn: boolean;
	}

	let { appName, signedIn }: Props = $props();
</script>

<section class="welcome" aria-labelledby="welcome-title">
	<Eyebrow tone="muted">Welcome to {appName}</Eyebrow>
	<Heading level={1} size="lg" id="welcome-title">Small stories swim in schools.</Heading>
	<Text>
		Nothing here runs longer than 1024 characters, about a hundred and fifty words. You’ll finish
		one story before your tea cools.
	</Text>
	<Text>
		But no story has to swim alone for long. Someone can write a sequel, someone else the prequel,
		and before you know it one little minnow becomes a school.
	</Text>
	<p class="links">
		<Link href="/about">Learn more</Link> or
		<Link href={signedIn ? '/write' : '/login'}>jump in</Link>
	</p>
</section>

<style>
	.welcome {
		display: grid;
		gap: var(--space-4);
		align-content: start;
		max-width: var(--measure);
	}

	.welcome :global(p) {
		line-height: var(--leading-prose);
	}

	.links {
		font-size: var(--text-lg);
		font-style: italic;
	}

	.links :global(a) {
		text-decoration: underline;
	}
</style>
