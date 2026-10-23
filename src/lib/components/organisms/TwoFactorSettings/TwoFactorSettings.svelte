<script lang="ts">
	import type { TwoFactorStatus } from '#lib/types.ts';
	import { Button, Heading, Link, Notice, Text } from '../../atoms/index.ts';
	import { FormField } from '../../molecules/index.ts';

	interface Props {
		status: TwoFactorStatus;
		/** Shown once, right after turning it on. */
		recoveryCodes?: string[] | null;
		turnedOff?: boolean;
		error?: string | null;
	}

	let { status, recoveryCodes = null, turnedOff = false, error = null }: Props = $props();
</script>

<section class="two-factor" id="two-factor" aria-labelledby="two-factor-title">
	<Heading level={2} size="md" id="two-factor-title">Two-step sign-in</Heading>
	<Text tone="muted" size="sm">
		Staff accounts enter a code from an authenticator app after signing in, so a stolen inbox or
		passkey alone can’t reach the moderator and admin tools.
	</Text>
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
			<FormField
				id="two-factor-code"
				name="code"
				label="Code from your app"
				autocomplete="one-time-code"
				maxlength={20}
				required
				{error}
			/>
			<div><Button type="submit">Turn on</Button></div>
		</form>
	{:else if status.state === 'locked'}
		<Text>
			On. <Link href="/login/two-factor?next=%2Fsettings%23two-factor">Enter your code</Link> to manage
			it.
		</Text>
	{:else}
		<Text>
			On, with {status.recoveryLeft}
			{status.recoveryLeft === 1 ? 'recovery code' : 'recovery codes'} left.
		</Text>
		<form class="form" method="POST" action="?/disableTwoFactor">
			<FormField
				id="two-factor-off-code"
				name="code"
				label="Code from your app"
				hint="To move it to a new phone, turn it off, then set it up again."
				autocomplete="one-time-code"
				maxlength={20}
				required
				{error}
			/>
			<div><Button type="submit" variant="secondary">Turn off</Button></div>
		</form>
	{/if}
</section>

<style>
	.two-factor,
	.codes,
	.form {
		display: grid;
		gap: var(--space-3);
	}

	.form {
		max-width: 20rem;
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
