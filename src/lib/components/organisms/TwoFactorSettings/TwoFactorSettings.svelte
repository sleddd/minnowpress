<script lang="ts">
	import type { TwoFactorStatus } from '#lib/types.ts';
	import { Badge, Button, Link, Notice, Text } from '../../atoms/index.ts';
	import { BlockField, SettingsSection } from '../../molecules/index.ts';

	interface Props {
		status: TwoFactorStatus;
		/** Shown once, right after turning it on. */
		recoveryCodes?: string[] | null;
		turnedOff?: boolean;
		error?: string | null;
	}

	let { status, recoveryCodes = null, turnedOff = false, error = null }: Props = $props();
</script>

<SettingsSection
	id="two-factor"
	title="Two-step sign-in"
	description="Staff accounts enter a code from an authenticator app after signing in, so a stolen inbox or passkey alone can’t reach the moderator and admin tools."
>
	{#if turnedOff}<Notice tone="success">Two-step sign-in is off.</Notice>{/if}

	{#if recoveryCodes}
		<Notice tone="success">Two-step sign-in is on.</Notice>
		<div class="codes">
			<Text
				><strong>Your recovery codes.</strong> Each works once if you lose your phone. Save them somewhere
				safe now: they won’t be shown again.</Text
			>
			<ul class="list" role="list">
				{#each recoveryCodes as code (code)}<li><code>{code}</code></li>{/each}
			</ul>
		</div>
	{/if}

	{#if status.state === 'setup'}
		<Text>
			Scan this with Google Authenticator, 1Password, Authy, or a similar app, then enter the
			6-digit code it shows.
		</Text>
		<img
			class="qr"
			src={status.qr}
			alt="QR code for your authenticator app"
			width="176"
			height="176"
		/>
		<Text size="sm" tone="muted"
			>Can’t scan it? Enter this key instead: <code>{status.secret}</code></Text
		>
		<form class="form" method="POST" action="?/enableTwoFactor">
			<BlockField
				id="two-factor-code"
				name="code"
				label="Code from your app"
				autocomplete="one-time-code"
				inputmode="numeric"
				placeholder="000 000"
				maxlength={20}
				required
				{error}
			/>
			<Button type="submit" variant="ribbon">Turn on</Button>
		</form>
	{:else if status.state === 'locked'}
		<p class="status">
			<Badge tone="accent" shape="ribbon">on</Badge>
			<Text as="span">
				<Link href="/login/two-factor?next=%2Fsettings%23two-factor">Enter your code</Link> to manage
				it.
			</Text>
		</p>
	{:else}
		<p class="status">
			<Badge tone="accent" shape="ribbon">on</Badge>
			<Text as="span">
				On, with {status.recoveryLeft}
				{status.recoveryLeft === 1 ? 'recovery code' : 'recovery codes'} left.
			</Text>
		</p>
		<form class="form" method="POST" action="?/disableTwoFactor">
			<BlockField
				id="two-factor-off-code"
				name="code"
				label="Code from your app"
				hint="To move it to a new phone, turn it off, then set it up again."
				autocomplete="one-time-code"
				inputmode="numeric"
				placeholder="000 000"
				maxlength={20}
				required
				{error}
			/>
			<Button type="submit" variant="dashed-danger">Turn off</Button>
		</form>
	{/if}
</SettingsSection>

<style>
	.codes {
		display: grid;
		gap: var(--space-3);
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	/* The code and its button side by side; the hint and any error sit under the code. */
	.form {
		display: grid;
		grid-template-columns: minmax(0, 24rem) max-content;
		align-items: start;
		gap: var(--space-5);
	}

	.form :global(button) {
		margin-top: var(--space-5);
	}

	.form :global(input) {
		letter-spacing: 0.2em;
	}

	@media (width < 36rem) {
		.form {
			grid-template-columns: minmax(0, 1fr);
		}

		.form :global(button) {
			justify-self: start;
			margin-top: var(--space-0);
		}
	}

	/* The SVG brings its own white background and quiet zone, so it scans in dark mode too. */
	.qr {
		border-radius: var(--radius-sm);
	}

	.list {
		display: grid;
		grid-template-columns: repeat(2, max-content);
		gap: var(--space-1) var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	code {
		font-family: var(--font-mono);
		word-break: break-all;
	}
</style>
