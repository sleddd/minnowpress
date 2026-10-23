<script lang="ts">
	import { Heading, Notice, Text, VisuallyHidden } from '../../atoms/index.ts';
	import { BlockField, PasskeyButton } from '../../molecules/index.ts';

	interface Props {
		appName: string;
		next: string;
		email?: string;
		error?: string | null;
		/** Which form the email and error belong to: signing in, or joining. */
		intent?: 'signin' | 'join';
		/** Set after the link is sent. */
		sentTo?: string | null;
		/** Set when a link was invalid or expired. */
		linkError?: boolean;
		/** Passkey sign-in; null when the browser can't do passkeys. */
		onPasskey?: (() => Promise<string | null>) | null;
	}

	let {
		appName,
		next,
		email = '',
		error = null,
		intent = 'join',
		sentTo = null,
		linkError = false,
		onPasskey = null
	}: Props = $props();

	// Without passkeys, or after a sign-in email was refused, the email sign-in starts open.
	const emailOpen = $derived(!onPasskey || (intent === 'signin' && Boolean(error)));
	const autocomplete = $derived(onPasskey ? 'email webauthn' : 'email');
</script>

<!-- A dashed card with a bookmark in its corner, like the logo's: returning members on the
     left, newcomers on the right. One email link does both, so either side can sign anyone in. -->
<div class="login">
	<span class="bookmark" aria-hidden="true"></span>
	<VisuallyHidden><Heading level={1}>Sign in to {appName}</Heading></VisuallyHidden>

	{#if sentTo}
		<div class="sent">
			<Heading level={2} size="xl">Check your email</Heading>
			<Notice tone="success">
				We sent a sign-in link to <strong>{sentTo}</strong>. It works once and expires in 15
				minutes.
			</Notice>
		</div>
	{:else}
		{#if linkError}
			<div class="notice">
				<Notice tone="error">That sign-in link is invalid or has expired. Request a new one.</Notice
				>
			</div>
		{/if}

		<section class="side" aria-labelledby="login-back">
			<Heading level={2} size="xl" id="login-back">Welcome back</Heading>
			{#if onPasskey}
				<Text size="lg">
					Sign in with the passkey saved on your device. It’s the quickest and safest way in.
				</Text>
				<div class="passkey">
					<PasskeyButton id="passkey-login" label="sign in with passkey" run={onPasskey} />
				</div>
			{:else}
				<Text size="lg">Sign in with your email. We’ll send you a link, no password needed.</Text>
			{/if}
			<details class="by-email" open={emailOpen}>
				<summary
					>{#if onPasskey}<span class="muted">No passkey?</span>
						<span class="toggle">Email me a sign-in link</span>{:else}<VisuallyHidden
							>Sign in by email</VisuallyHidden
						>{/if}</summary
				>
				<form class="form" method="POST">
					<input type="hidden" name="next" value={next} />
					<input type="hidden" name="intent" value="signin" />
					<BlockField
						id="signin-email"
						name="email"
						type="email"
						label="Your email"
						placeholder="you@example.com"
						value={intent === 'signin' ? email : ''}
						error={intent === 'signin' ? error : null}
						required
						{autocomplete}
					/>
					<div><button class="ribbon" type="submit">email me a link</button></div>
				</form>
			</details>
		</section>

		<section class="side join" aria-labelledby="login-new">
			<Heading level={2} size="xl" id="login-new">New here?</Heading>
			<Text size="lg">
				Join with your email. We’ll send a link to finish signing up, no password needed.
			</Text>
			<form class="form" method="POST">
				<input type="hidden" name="next" value={next} />
				<input type="hidden" name="intent" value="join" />
				<BlockField
					id="email"
					name="email"
					type="email"
					label="Email"
					placeholder="you@example.com"
					value={intent === 'join' ? email : ''}
					error={intent === 'join' ? error : null}
					required
					{autocomplete}
				/>
				<div><button class="outline" type="submit">join {appName}</button></div>
			</form>
			<Text size="sm" tone="muted">
				Once you’re in, we’ll suggest adding a passkey. It’s optional; email links always work.
			</Text>
		</section>
	{/if}
</div>

<style>
	.login {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-7);
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

	.side,
	.sent,
	.form {
		display: grid;
		gap: var(--space-5);
		align-content: start;
	}

	.form {
		margin-top: var(--space-2);
	}

	/* A dashed rule between the two sides: across on phones, down the middle when there's room. */
	.join {
		padding-top: var(--space-7);
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	@media (min-width: 60rem) {
		.login {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: var(--space-0);
		}

		.notice,
		.sent {
			grid-column: 1 / -1;
			margin-bottom: var(--space-5);
		}

		.side:not(.join) {
			padding-right: var(--space-7);
		}

		.join {
			padding: var(--space-0) var(--space-0) var(--space-0) var(--space-7);
			border-top: 0;
			border-left: var(--border-width) dashed var(--color-border-strong);
		}
	}

	/* The ribbon buttons: passkey sign-in, and the email link once the sign-in email is open. */
	.ribbon,
	.passkey :global(button) {
		--notch: var(--space-5);
		--pad-end: calc(var(--notch) + var(--space-6));

		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4) var(--pad-end) var(--space-4) var(--space-6);
		border: 0;
		border-radius: var(--space-0);
		background: var(--color-accent-hover);
		color: var(--color-accent-contrast);
		font: inherit;
		font-size: var(--text-2xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		white-space: nowrap;
		cursor: pointer;
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--notch)) 50%, 100% 100%, 0 100%);
	}

	.ribbon {
		font-size: var(--text-xl);
	}

	.ribbon:hover,
	.passkey :global(button:hover) {
		background: var(--color-accent);
	}

	.ribbon:focus-visible {
		outline: var(--border-width) solid var(--color-focus);
		outline-offset: var(--space-1);
	}

	summary {
		width: fit-content;
		list-style: none;
		cursor: pointer;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	.muted {
		color: var(--color-text-muted);
	}

	.toggle {
		color: var(--color-accent);
		font-style: italic;
		text-decoration: underline;
	}

	/* The join button: an outline that firms up once there's an address to send to. */
	.outline {
		padding: var(--space-3) var(--space-6);
		border: var(--border-width) solid var(--color-accent);
		background: transparent;
		color: var(--color-accent);
		font: inherit;
		font-size: var(--text-xl);
		font-style: italic;
		font-weight: var(--weight-bold);
		cursor: pointer;
	}

	.outline:hover {
		background: var(--color-accent-soft);
	}

	.outline:focus-visible {
		outline: var(--border-width) solid var(--color-focus);
		outline-offset: var(--space-1);
	}

	.form:has(:global(input:placeholder-shown)) .outline {
		border-color: var(--color-nav-underline);
		color: var(--color-text-muted);
	}

	/* Two narrow columns, or a phone: the passkey ribbon's label steps down a size. */
	@media (max-width: 72rem) {
		.passkey :global(button) {
			font-size: var(--text-xl);
		}
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
