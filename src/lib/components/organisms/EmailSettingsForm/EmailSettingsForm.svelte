<script lang="ts">
	import { enhance } from '$app/forms';
	import type { NotificationPrefsView } from '#lib/types.ts';
	import { Button, Notice } from '../../atoms/index.ts';
	import { CheckboxField, SettingsSection } from '../../molecules/index.ts';

	interface Props {
		prefs: NotificationPrefsView;
		saved?: boolean;
	}

	let { prefs, saved = false }: Props = $props();
</script>

<SettingsSection id="email" title="Email" description="What we write to you about.">
	<form
		class="form"
		method="POST"
		action="?/notifications"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
	>
		{#if saved}<Notice tone="success">Email settings saved.</Notice>{/if}
		<CheckboxField
			size="md"
			id="notifyContinuations"
			name="notifyContinuations"
			label="Someone writes a prequel or sequel to my story"
			checked={prefs.notifyContinuations}
		/>
		<CheckboxField
			size="md"
			id="notifyComments"
			name="notifyComments"
			label="Someone comments on my story"
			checked={prefs.notifyComments}
		/>
		<CheckboxField
			size="md"
			id="notifyDigest"
			name="notifyDigest"
			label="Weekly digest of new stories from writers I follow"
			checked={prefs.notifyDigest}
		/>
		<div class="save"><Button type="submit" variant="dashed">Save email settings</Button></div>
	</form>
</SettingsSection>

<style>
	.form {
		display: grid;
		gap: var(--space-4);
	}

	.save {
		margin-top: var(--space-3);
	}
</style>
