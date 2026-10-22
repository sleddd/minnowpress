<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Icon, Link } from '../../atoms/index.ts';

	interface Props {
		storyId: number;
		bookmarked: boolean;
		signedIn: boolean;
	}

	let { storyId, bookmarked, signedIn }: Props = $props();
</script>

{#if signedIn}
	<form method="POST" action="/s/{storyId}?/bookmark" use:enhance>
		<Button variant="ghost" size="sm" type="submit" aria-pressed={bookmarked}>
			<Icon name="bookmark" filled={bookmarked} />
			{bookmarked ? 'Saved' : 'Save'}
		</Button>
	</form>
{:else}
	<Link href="/login?next=/s/{storyId}" variant="subtle"><Icon name="bookmark" /> Save</Link>
{/if}
