<script lang="ts">
	import type { SessionView } from '#lib/types.ts';
	import { Badge, Button, Notice, Text, Timestamp } from '../../atoms/index.ts';
	import { SettingsSection } from '../../molecules/index.ts';

	interface Props {
		sessions: SessionView[];
		/** Set after signing out other devices. */
		revoked?: boolean;
	}

	let { sessions, revoked = false }: Props = $props();

	const others = $derived(sessions.filter((s) => !s.current).length);
</script>

<SettingsSection
	id="sessions"
	title="Where you’re signed in"
	description="Every sign-in ends automatically two days after it starts."
>
	{#if revoked}<Notice tone="success">Signed out.</Notice>{/if}
	<ul class="list" role="list">
		{#each sessions as session (session.id)}
			<li class="item">
				<div class="info">
					<Text>
						<strong>{session.device}</strong>
						{#if session.current}<Badge tone="accent" shape="tag">this device</Badge>{/if}
					</Text>
					<Text size="sm" tone="muted">
						{#if session.lastUsedAt}Active <Timestamp date={session.lastUsedAt} />{/if}
						{#if session.signedInAt}· signed in <Timestamp date={session.signedInAt} />{/if}
					</Text>
				</div>
				{#if !session.current}
					<form method="POST" action="?/revokeSession">
						<input type="hidden" name="sessionId" value={session.id} />
						<Button type="submit" variant="ghost" size="sm">Sign out</Button>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
	{#if others > 0}
		<form method="POST" action="?/revokeOtherSessions">
			<Button type="submit" variant="dashed">Sign out everywhere else</Button>
		</form>
	{/if}
</SettingsSection>

<style>
	.list {
		display: grid;
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding-block: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
	}

	.info {
		display: grid;
		gap: var(--space-1);
	}
</style>
