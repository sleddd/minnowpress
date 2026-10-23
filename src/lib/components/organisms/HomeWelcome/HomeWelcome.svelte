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
		Welcome to Minnow Press, a little corner of the internet for the shortest fictions. Every story
		here fits within 1,024 characters, about 150 words, so you can read one, or write one, before
		your tea cools. And no story has to swim alone. Anyone can write its sequel or its prequel, and
		before long one little minnow becomes a school.
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
