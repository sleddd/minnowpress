<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PasskeyView } from '#lib/types.ts';
	import { Button, Heading, Label, Text, TextInput, Timestamp } from '../../atoms/index.ts';
	import { PasskeyButton } from '../../molecules/index.ts';

	interface Props {
		passkeys: PasskeyView[];
		/** False when this browser can't create passkeys. */
		supported: boolean;
		/** Creates a passkey with the given name; resolves to an error message or null. */
		onAdd: (name: string) => Promise<string | null>;
	}

	let { passkeys, supported, onAdd }: Props = $props();
	let name = $state('');
</script>

<section class="passkeys" aria-labelledby="passkeys-title">
	<Heading level={2} size="md" id="passkeys-title">Passkeys</Heading>
	<Text tone="muted" size="sm">
		Sign in with your fingerprint, face, or device PIN instead of an email link.
	</Text>

	{#if passkeys.length}
		<ul class="list" role="list">
			{#each passkeys as passkey (passkey.id)}
				<li class="item">
					<div>
						<Text>{passkey.name}</Text>
						<Text as="span" size="sm" tone="muted">
							Added <Timestamp date={passkey.createdAt} relative={false} />
							{#if passkey.lastUsedAt}· last used <Timestamp date={passkey.lastUsedAt} />{/if}
						</Text>
					</div>
					<form method="POST" action="?/removePasskey" use:enhance>
						<input type="hidden" name="id" value={passkey.id} />
						<Button type="submit" variant="ghost" size="sm" aria-label="Remove {passkey.name}"
							>Remove</Button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}

	{#if supported}
		<div class="add">
			<Label for="passkey-name" optional>Name this passkey</Label>
			<TextInput id="passkey-name" bind:value={name} maxlength={50} placeholder="e.g. MacBook" />
			<PasskeyButton id="add-passkey" label="Add a passkey" run={() => onAdd(name || 'Passkey')} />
		</div>
	{:else}
		<Text tone="muted" size="sm">This browser doesn't support passkeys.</Text>
	{/if}
</section>

<style>
	.passkeys,
	.list,
	.add {
		display: grid;
		gap: var(--space-3);
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-3);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.add {
		gap: var(--space-1);
		max-width: 20rem;
	}
</style>
