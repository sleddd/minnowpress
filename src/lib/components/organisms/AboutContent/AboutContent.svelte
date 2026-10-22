<script lang="ts">
	import { Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
	}

	let { appName }: Props = $props();
</script>

<article class="about" aria-labelledby="about-title">
	<Heading level={1} id="about-title">About {appName}</Heading>
	<Text size="lg">
		{appName} is a place for very short fiction. Every story is 1,024 characters or less, about what you
		can write in fifteen minutes.
	</Text>
	<Text>
		Any story can be continued. Write a <strong>prequel</strong> to say what came before, or a
		<strong>sequel</strong> to say what happens next. Stories by different writers grow into branching
		chains that nobody planned.
	</Text>

	<Heading level={2} size="md">Written by people</Heading>
	<Text>
		Everything on {appName} is written by a human. The only place we use AI is to suggest writing prompts
		for challenges. AI never writes, edits, or comments on stories here, and stories that are AI-generated
		are removed.
	</Text>

	<Heading level={2} size="md">Where this comes from</Heading>
	<Text>
		{appName} follows two sites that did this first. <Link href="https://ficlets.com" rel="noopener"
			>Ficlets</Link
		> ran at AOL from 2006 to 2009. It was created by Kevin Lawver and built with Jason Garber. When it
		closed, they started
		<Link href="https://ficly.com" rel="noopener">Ficly</Link>, which ran from 2009 to 2014. Both
		archives are still online and worth reading.
	</Text>
	<Text>
		{appName} isn't affiliated with Ficlets or Ficly. It's a new home for the same idea, built with gratitude.
	</Text>

	<Heading level={2} size="md">Sharing</Heading>
	<Text>
		Published stories are licensed
		<Link href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener"
			>CC BY-SA 4.0</Link
		>. Anyone can share and build on them, as long as they credit the author and share alike. That's
		what makes prequels and sequels possible.
	</Text>
</article>

<style>
	.about {
		display: grid;
		gap: var(--space-4);
		max-width: var(--measure);
	}
</style>
