<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_APP_NAME } from '$app/env/public';
	import { invalidateAll } from '$app/navigation';
	import { passkeysSupported, registerPasskey } from '#lib/passkey-client.ts';
	import { PageMeta } from '#lib/components/atoms/index.ts';
	import {
		AppearanceForm,
		EmailSettingsForm,
		PasskeyManager,
		ProfileForm,
		SessionList
	} from '#lib/components/organisms/index.ts';
	import { FormLayout } from '#lib/components/templates/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form && 'values' in form && form.values ? form.values : data.values);
	// Passkey support is only knowable in the browser, after hydration.
	let supported = $state(false);
	onMount(() => {
		supported = passkeysSupported();
	});

	async function addPasskey(name: string) {
		const result = await registerPasskey(name);
		if (!result.ok) return result.error;
		await invalidateAll();
		return null;
	}
</script>

<PageMeta title="Settings" siteName={PUBLIC_APP_NAME} />

<FormLayout>
	{#key values}
		<ProfileForm
			{values}
			errors={form && 'errors' in form ? form.errors : {}}
			saved={Boolean(form && 'saved' in form && form.saved)}
			welcome={data.welcome && !form}
		/>
	{/key}
	<EmailSettingsForm
		prefs={data.prefs}
		saved={Boolean(form && 'notificationsSaved' in form && form.notificationsSaved)}
	/>
	<AppearanceForm
		theme={data.theme}
		saved={Boolean(form && 'themeSaved' in form && form.themeSaved)}
	/>
	<PasskeyManager passkeys={data.passkeys} {supported} onAdd={addPasskey} />
	<SessionList
		sessions={data.sessions}
		revoked={Boolean(form && 'sessionsRevoked' in form && form.sessionsRevoked)}
	/>
</FormLayout>
