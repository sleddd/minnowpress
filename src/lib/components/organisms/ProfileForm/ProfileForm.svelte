<script lang="ts">
	import { Button, Notice } from '../../atoms/index.ts';
	import { BlockField, CheckboxField, SettingsSection } from '../../molecules/index.ts';

	interface Props {
		values: {
			username: string;
			displayName: string;
			bio: string;
			website: string;
			showMature: boolean;
		};
		errors?: Partial<
			Record<'username' | 'displayName' | 'bio' | 'website' | 'adultConfirmed', string>
		>;
		saved?: boolean;
		welcome?: boolean;
		/** Already confirmed they're 18 or older, so turning mature stories on asks nothing more. */
		adultConfirmed?: boolean;
		/** Shown before the username, e.g. "minnowpress.com/@". */
		profilePrefix?: string;
	}

	let {
		values,
		errors = {},
		saved = false,
		welcome = false,
		adultConfirmed = false,
		profilePrefix = '/@'
	}: Props = $props();

	// The page re-keys the form when saved values change.
	// svelte-ignore state_referenced_locally
	let showMature = $state(values.showMature);
</script>

<SettingsSection id="profile" title="Profile" description="How you appear to other writers.">
	<form class="form" method="POST" action="?/profile">
		{#if welcome}<Notice
				>We picked a username from your email. Change it to whatever you like.</Notice
			>{/if}
		{#if saved}<Notice tone="success">Profile saved.</Notice>{/if}

		<BlockField
			id="username"
			name="username"
			label="Username"
			value={values.username}
			error={errors.username}
			required
			prefix={profilePrefix}
			hint="Your profile lives at /@username."
		/>
		<BlockField
			id="displayName"
			name="displayName"
			label="Display name"
			value={values.displayName}
			error={errors.displayName}
			required
			maxlength={50}
		/>
		<BlockField
			id="bio"
			name="bio"
			label="Bio"
			rows={5}
			value={values.bio}
			error={errors.bio}
			optional
			maxlength={500}
		/>
		<BlockField
			id="website"
			name="website"
			label="Website"
			type="url"
			value={values.website}
			error={errors.website}
			optional
			placeholder="https://"
		/>
		<CheckboxField
			size="md"
			id="showMature"
			name="showMature"
			label="Show mature stories"
			hint="Mature stories are hidden from feeds unless you turn this on."
			bind:checked={showMature}
		/>
		{#if showMature && !adultConfirmed}
			<CheckboxField
				size="md"
				id="adultConfirmed"
				name="adultConfirmed"
				label="I’m 18 or older"
				hint="Mature stories are for adults only."
				required
				error={errors.adultConfirmed}
			/>
		{/if}

		<div><Button type="submit" variant="ribbon">Save profile</Button></div>
	</form>
</SettingsSection>

<style>
	.form {
		display: grid;
		gap: var(--space-5);
	}
</style>
