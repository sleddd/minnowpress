<script lang="ts">
	import { formatDate } from '#lib/format.ts';
	import type { ProfileView } from '#lib/types.ts';
	import { Avatar, Heading, Link, Text } from '../../atoms/index.ts';
	import { FollowButton } from '../../molecules/index.ts';

	interface Props {
		profile: ProfileView;
		counts: { stories: number; followers: number; following: number };
		isSelf: boolean;
		following: boolean;
		signedIn: boolean;
	}

	let { profile, counts, isSelf, following, signedIn }: Props = $props();

	const host = $derived(profile.website ? new URL(profile.website).host : null);
	const bio = $derived(profile.bio.trim());
	const stats = $derived([
		{ n: counts.stories, label: counts.stories === 1 ? 'story' : 'stories' },
		{ n: counts.followers, label: counts.followers === 1 ? 'follower' : 'followers' },
		{ n: counts.following, label: 'following' }
	]);
</script>

<!-- The writer's card: who they are, at a glance. -->
<header class="profile">
	<div class="face"><Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" /></div>
	<div class="who">
		<Heading level={1} size="xl">{profile.displayName}</Heading>
		<Text tone="muted" size="sm"
			>@{profile.username} · Writing since {formatDate(profile.createdAt)}</Text
		>
	</div>
	{#if bio}<p class="bio">“{bio}”</p>{/if}
	{#if profile.website && host}<p class="site">
			<Link href={profile.website} rel="nofollow noopener ugc">{host}</Link>
		</p>{/if}
	<ul class="stats" role="list">
		{#each stats as stat (stat.label)}
			<li><strong>{stat.n}</strong> <span>{stat.label}</span></li>
		{/each}
	</ul>
	<div class="action">
		{#if isSelf}
			<Link href="/settings">Edit profile</Link>
		{:else}
			<FollowButton username={profile.username} {following} {signedIn} />
		{/if}
	</div>
</header>

<style>
	.profile {
		display: grid;
		gap: var(--space-4);
		justify-items: start;
	}

	/* The avatar sits in a dashed ring. */
	.face {
		padding: var(--space-1);
		border: var(--border-width) dashed var(--color-accent);
		border-radius: var(--radius-full);
	}

	.face :global(.avatar) {
		border-radius: var(--radius-full);
	}

	.who {
		display: grid;
		gap: var(--space-1);
	}

	.bio {
		font-size: var(--text-lg);
		font-style: italic;
		white-space: pre-line;
	}

	.site :global(a) {
		text-decoration: underline;
	}

	.stats {
		display: flex;
		align-self: stretch;
		padding-block: var(--space-3);
		border-block: var(--border-width) dashed var(--color-border-strong);
	}

	.stats li {
		display: grid;
		padding-inline: var(--space-4);
	}

	.stats li + li {
		border-left: var(--border-width) dashed var(--color-border-strong);
	}

	.stats li:first-child {
		padding-left: var(--space-0);
	}

	.stats strong {
		color: var(--color-accent);
		font-size: var(--text-xl);
		line-height: var(--leading-tight);
	}

	.stats span {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}

	/* Edit profile / Follow: a dashed outline button. */
	.action :global(a),
	.action :global(button) {
		padding: var(--space-2) var(--space-4);
		border: var(--border-width) dashed var(--color-accent);
		border-radius: var(--space-0);
		background: transparent;
		color: var(--color-accent);
		font-style: italic;
		font-weight: var(--weight-bold);
		text-decoration: none;
	}
</style>
