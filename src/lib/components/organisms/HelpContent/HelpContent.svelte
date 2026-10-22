<script lang="ts">
	import { Heading, Link, Text } from '../../atoms/index.ts';

	interface Props {
		appName: string;
	}

	let { appName }: Props = $props();
</script>

<article class="help" aria-labelledby="help-title">
	<Heading level={1} id="help-title">Help</Heading>

	<Heading level={2} size="md">How do I join?</Heading>
	<Text>
		<Link href="/login">Sign in</Link> with your email address. We send you a link, and the first time
		you use it you pick a username. You can add a passkey in <Link href="/settings">settings</Link> so
		you don’t need the email next time.
	</Text>

	<Heading level={2} size="md">How long can a story be?</Heading>
	<Text
		>Between 60 and 1,024 characters. An emoji or an accented letter counts as one character.</Text
	>

	<Heading level={2} size="md">What are prequels and sequels?</Heading>
	<Text>
		Every story on {appName} can be continued by anyone. A sequel says what happens next; a prequel says
		what came before. Use the “Write a prequel” and “Write a sequel” links under any story.
	</Text>

	<Heading level={2} size="md">How do ratings work?</Heading>
	<Text>
		Members rate stories from one to five fish. You can change your rating any time, but you can’t
		rate your own stories. Stories from the Ficly archive keep the ratings they had there.
	</Text>

	<Heading level={2} size="md">What are challenges?</Heading>
	<Text>
		One challenge runs at a time, for 14 days; when it ends, the next one starts. Past challenges
		still take stories, so it’s never too late to answer one. Any member can
		<Link href="/challenges/new">suggest one</Link>; someone from the team reviews it first. Some
		prompts are suggested by AI: when no member challenge is waiting, a new AI prompt starts.
		Writing prompts are the only thing AI does here.
	</Text>

	<Heading level={2} size="md">Can I use AI to write?</Heading>
	<Text>
		No. Everything on {appName} is written by people. Stories that are AI-generated are removed. If you
		think a story was, use “Report” on its page. See the <Link href="/terms">terms</Link>.
	</Text>

	<Heading level={2} size="md">Can I edit a story after publishing?</Heading>
	<Text>
		Yes. Open your story and choose “Edit story”. It stays published and shows when it was last
		edited. Stories imported from the Ficly archive can’t be edited. To keep working on something
		before anyone sees it, tick “Save as a draft”.
	</Text>

	<Heading level={2} size="md">Can I delete a story?</Heading>
	<Text>
		Yes. On your story, choose “Delete this story”. It’s gone for good, along with its comments and
		ratings. Prequels and sequels other people wrote stay up.
	</Text>
</article>

<style>
	.help {
		display: grid;
		gap: var(--space-4);
	}
</style>
