<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { passkeyAutofill, passkeysSupported, signInWithPasskey } from '#lib/passkey-client.ts';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import { LoginForm } from '#lib/components/organisms/index.ts';
	import { FormLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Passkey support is only knowable in the browser, after hydration; until then, assume it.
	let supported = $state<boolean | null>(null);
	onMount(() => {
		supported = passkeysSupported();
		// Offer saved passkeys in the email field's autofill; it waits until one is picked.
		if (supported)
			passkeyAutofill(data.next).then((result) => {
				if (result) window.location.assign(result.redirect ?? '/');
			});
	});

	async function passkey() {
		const result = await signInWithPasskey(data.next);
		if (!result.ok) return result.error;
		// A full load so every layout picks up the new session.
		window.location.assign(result.redirect ?? '/');
		return null;
	}
</script>

<PageMeta title="Sign in" siteName={PUBLIC_APP_NAME} />

<FormLayout width="wide">
	<LoginForm
		appName={PUBLIC_APP_NAME}
		next={data.next}
		email={form && 'email' in form ? form.email : ''}
		error={form && 'error' in form ? form.error : null}
		intent={form && 'intent' in form ? form.intent : 'join'}
		sentTo={form && 'sentTo' in form ? form.sentTo : null}
		linkError={data.linkError}
		onPasskey={supported === false ? null : passkey}
	/>
</FormLayout>
