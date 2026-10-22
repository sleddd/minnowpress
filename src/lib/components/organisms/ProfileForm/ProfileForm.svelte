<script lang="ts">
	import { Button, Heading, Notice } from '../../atoms/index.ts';
	import { CheckboxField, FormField } from '../../molecules/index.ts';

	interface Props {
		values: {
			username: string;
			displayName: string;
			bio: string;
			website: string;
			showMature: boolean;
		};
		errors?: Partial<Record<'username' | 'displayName' | 'bio' | 'website', string>>;
		saved?: boolean;
		welcome?: boolean;
	}

	let { values, errors = {}, saved = false, welcome = false }: Props = $props();
</script>

<form class="form" method="POST" action="?/profile">
	<Heading level={1} size="lg">{welcome ? 'Welcome! Set up your profile' : 'Your profile'}</Heading>
	{#if welcome}<Notice>We picked a username from your email. Change it to whatever you like.</Notice
		>{/if}
	{#if saved}<Notice tone="success">Profile saved.</Notice>{/if}

	<FormField
		id="username"
		name="username"
		label="Username"
		value={values.username}
		error={errors.username}
		required
		hint="Your profile lives at /@username."
	/>
	<FormField
		id="displayName"
		name="displayName"
		label="Display name"
		value={values.displayName}
		error={errors.displayName}
		required
		maxlength={50}
	/>
	<FormField
		id="bio"
		name="bio"
		label="Bio"
		type="textarea"
		rows={4}
		value={values.bio}
		error={errors.bio}
		optional
		maxlength={500}
	/>
	<FormField
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
		id="showMature"
		name="showMature"
		label="Show mature stories"
		hint="Mature stories are hidden from feeds unless you turn this on."
		checked={values.showMature}
	/>

	<div><Button type="submit">Save profile</Button></div>
</form>

<style>
	.form {
		display: grid;
		gap: var(--space-4);
	}
</style>
