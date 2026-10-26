<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Link } from '../../atoms/index.ts';

	interface Props {
		/** Who to follow: a member's username, or an archive author's name when `path` is given. */
		username: string;
		/** The page whose follow and unfollow actions to post to; a member's profile by default. */
		path?: string;
		following: boolean;
		signedIn: boolean;
		/** button: a regular button · quiet: small dashed italic "follow" */
		look?: 'button' | 'quiet';
	}

	let { username, path, following, signedIn, look = 'button' }: Props = $props();

	const page = $derived(path ?? `/@${username}`);
</script>

{#if look === 'quiet'}
	<form
		class="quiet"
		method="POST"
		action="{page}?/{following ? 'unfollow' : 'follow'}"
		use:enhance
	>
		<button type="submit" aria-label="{following ? 'Unfollow' : 'Follow'} {username}"
			>{following ? 'following' : 'follow'}</button
		>
	</form>
{:else if signedIn}
	<form method="POST" action="{page}?/{following ? 'unfollow' : 'follow'}" use:enhance>
		<Button variant={following ? 'secondary' : 'primary'} size="sm" type="submit">
			{following ? 'Unfollow' : 'Follow'}
		</Button>
	</form>
{:else}
	<Link href="/login?next={page}" variant="button">Follow</Link>
{/if}

<style>
	.quiet button {
		padding: var(--space-1) var(--space-3);
		border: var(--border-width) dashed var(--color-accent);
		background: transparent;
		color: var(--color-accent);
		font: inherit;
		font-style: italic;
		cursor: pointer;
	}

	.quiet button:hover {
		background: var(--color-accent-soft);
	}
</style>
