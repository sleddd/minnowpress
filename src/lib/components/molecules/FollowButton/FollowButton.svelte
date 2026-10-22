<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Link } from '../../atoms/index.ts';

	interface Props {
		username: string;
		following: boolean;
		signedIn: boolean;
		/** button: a regular button · quiet: small dashed italic "follow" */
		look?: 'button' | 'quiet';
	}

	let { username, following, signedIn, look = 'button' }: Props = $props();
</script>

{#if look === 'quiet'}
	<form
		class="quiet"
		method="POST"
		action="/@{username}?/{following ? 'unfollow' : 'follow'}"
		use:enhance
	>
		<button type="submit" aria-label="{following ? 'Unfollow' : 'Follow'} {username}"
			>{following ? 'following' : 'follow'}</button
		>
	</form>
{:else if signedIn}
	<form method="POST" action="/@{username}?/{following ? 'unfollow' : 'follow'}" use:enhance>
		<Button variant={following ? 'secondary' : 'primary'} size="sm" type="submit">
			{following ? 'Following' : 'Follow'}
		</Button>
	</form>
{:else}
	<Link href="/login?next=/@{username}" variant="button">Follow</Link>
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
