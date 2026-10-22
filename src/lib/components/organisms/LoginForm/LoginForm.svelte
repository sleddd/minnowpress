<script lang="ts">
	import { Heading, Notice, Text } from '../../atoms/index.ts';
	import { BlockField, PasskeyButton } from '../../molecules/index.ts';

	interface Props {
		appName: string;
		next: string;
		email?: string;
		error?: string | null;
		/** Set after the link is sent. */
		sentTo?: string | null;
		/** Set when a link was invalid or expired. */
		linkError?: boolean;
		/** Offered when the browser supports passkeys; resolves to an error message or null. */
		onPasskey?: (() => Promise<string | null>) | null;
	}

	let {
		appName,
		next,
		email = '',
		error,
		sentTo = null,
		linkError = false,
		onPasskey = null
	}: Props = $props();
</script>

<!-- A dashed card with a bookmark in its corner, like the logo's. -->
<div class="login">
	<span class="bookmark" aria-hidden="true"></span>
	<Heading level={1} size="xl">Sign in to {appName}</Heading>

	{#if sentTo}
		<Notice tone="success">
			Check your email. We sent a sign-in link to <strong>{sentTo}</strong>. It works once and
			expires in 15 minutes.
		</Notice>
	{:else}
		{#if linkError}
			<Notice tone="error"
				>That sign-in link is invalid or has expired. Request a new one below.</Notice
			>
		{/if}
		<Text
			>No password needed. Enter your email and we'll send you a link. <em class="new">New here?</em
			>
			The same link creates your account.</Text
		>
		<form class="form" method="POST">
			<input type="hidden" name="next" value={next} />
			<BlockField
				id="email"
				name="email"
				type="email"
				label="Email"
				placeholder="you@example.com"
				value={email}
				{error}
				required
				autocomplete={onPasskey ? 'email webauthn' : 'email'}
			/>
			<div><button class="send" type="submit">email me a link</button></div>
		</form>
		{#if onPasskey}
			<p class="divider"><span>or</span></p>
			<div class="passkey">
				<Text tone="muted">Already added a passkey?</Text>
				<PasskeyButton id="passkey-login" label="Sign in with a passkey" run={onPasskey} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.login {
		position: relative;
		display: grid;
		gap: var(--space-5);
		padding: var(--space-8) var(--space-7) var(--space-7);
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.bookmark {
		--ribbon: calc(var(--space-6) * 1.25);

		position: absolute;
		top: var(--space-0);
		left: var(--space-7);
		width: var(--ribbon);
		height: calc(var(--ribbon) * 1.5);
		background: var(--color-accent);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
	}

	.bookmark::before,
	.bookmark::after {
		content: '';
		position: absolute;
		top: var(--space-0);
		bottom: var(--space-3);
		border-left: var(--border-width) dashed var(--color-nav-underline);
	}

	.bookmark::before {
		left: var(--space-1);
	}

	.bookmark::after {
		right: var(--space-1);
	}

	.new {
		color: var(--color-accent);
	}

	.form {
		display: grid;
		gap: var(--space-6);
	}

	/* The ribbon button; pale until there's an address to send to (no JavaScript needed). */
	.send {
		--notch: var(--space-4);
		--pad-end: calc(var(--notch) + var(--space-5));

		padding: var(--space-3) var(--pad-end) var(--space-3) var(--space-6);
		border: 0;
		background: var(--color-accent);
		color: var(--color-accent-contrast);
		font: inherit;
		font-size: var(--text-xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		cursor: pointer;
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.send:hover {
		background: var(--color-accent-hover);
	}

	.send:focus-visible {
		outline: var(--border-width) solid var(--color-focus);
		outline-offset: var(--space-1);
	}

	.form:has(:global(input:placeholder-shown)) .send {
		background: var(--color-nav-underline);
		color: var(--color-accent);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		color: var(--color-text-muted);
		font-style: italic;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.passkey {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.passkey :global(button) {
		border: var(--border-width) dashed var(--color-accent);
		border-radius: var(--space-0);
		background: transparent;
		color: var(--color-accent);
		font-style: italic;
		font-weight: var(--weight-bold);
	}

	.passkey :global(button:hover) {
		background: var(--color-accent-soft);
	}

	@media (max-width: 40rem) {
		.login {
			padding-inline: var(--space-5);
		}

		.bookmark {
			left: var(--space-5);
		}
	}
</style>
