<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PasskeyView } from '#lib/types.ts';
	import { Icon, Text, Timestamp } from '../../atoms/index.ts';
	import { BlockField, PasskeyButton, SettingsSection } from '../../molecules/index.ts';

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

<SettingsSection
	id="passkeys"
	title="Passkeys"
	description="Sign in with your fingerprint, face, or device PIN instead of an email link."
>
	{#if passkeys.length}
		<ul class="list" role="list">
			{#each passkeys as passkey (passkey.id)}
				<li class="item">
					<Icon name="key" />
					<div class="info">
						<strong>{passkey.name}</strong>
						<Text as="span" size="sm" tone="muted">
							Added <Timestamp date={passkey.createdAt} relative={false} />
							{#if passkey.lastUsedAt}· last used <Timestamp date={passkey.lastUsedAt} />{/if}
						</Text>
					</div>
					<form method="POST" action="?/removePasskey" use:enhance>
						<input type="hidden" name="id" value={passkey.id} />
						<button type="submit" class="remove" aria-label="Remove {passkey.name}">Remove</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}

	{#if supported}
		<div class="add">
			<BlockField
				id="passkey-name"
				name="passkeyName"
				label="Name this passkey"
				optional
				bind:value={name}
				maxlength={50}
				placeholder="e.g. MacBook"
			/>
			<PasskeyButton
				id="add-passkey"
				label="Add a passkey"
				variant="dashed"
				run={() => onAdd(name || 'Passkey')}
			/>
		</div>
	{:else}
		<Text tone="muted" size="sm">This browser doesn't support passkeys.</Text>
	{/if}
</SettingsSection>

<style>
	.list {
		display: grid;
		border-top: var(--border-width) dashed var(--color-border-strong);
	}

	.item {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-4);
		padding-block: var(--space-4);
		border-bottom: var(--border-width) dashed var(--color-border-strong);
		color: var(--color-accent);
	}

	.info {
		display: grid;
		gap: var(--space-1);
		color: var(--color-text);
	}

	.remove {
		padding: var(--space-0);
		border: 0;
		background: none;
		color: var(--color-text-muted);
		font: inherit;
		font-style: italic;
		cursor: pointer;
	}

	.remove:hover {
		color: var(--color-danger);
	}

	.add {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: var(--space-5);
	}

	@media (width < 36rem) {
		.add {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
