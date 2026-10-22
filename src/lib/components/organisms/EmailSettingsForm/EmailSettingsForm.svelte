<script lang="ts">
	import { enhance } from '$app/forms';
	import type { NotificationPrefsView } from '#lib/types.ts';
	import { Button, Heading, Notice } from '../../atoms/index.ts';
	import { CheckboxField } from '../../molecules/index.ts';

	interface Props {
		prefs: NotificationPrefsView;
		saved?: boolean;
	}

	let { prefs, saved = false }: Props = $props();
</script>

<form
	class="form"
	method="POST"
	action="?/notifications"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	<Heading level={2} size="md">Email</Heading>
	{#if saved}<Notice tone="success">Email settings saved.</Notice>{/if}
	<CheckboxField
		id="notifyContinuations"
		name="notifyContinuations"
		label="Someone writes a prequel or sequel to my story"
		checked={prefs.notifyContinuations}
	/>
	<CheckboxField
		id="notifyComments"
		name="notifyComments"
		label="Someone comments on my story"
		checked={prefs.notifyComments}
	/>
	<CheckboxField
		id="notifyDigest"
		name="notifyDigest"
		label="Weekly digest of new stories from writers I follow"
		checked={prefs.notifyDigest}
	/>
	<div><Button type="submit" variant="secondary">Save email settings</Button></div>
</form>

<style>
	.form {
		display: grid;
		gap: var(--space-3);
	}
</style>
