<script lang="ts">
	import type { Theme } from '#lib/theme.ts';
	import { Notice } from '../../atoms/index.ts';
	import { SettingsSection } from '../../molecules/index.ts';

	interface Props {
		theme: Theme;
		saved?: boolean;
	}

	let { theme, saved = false }: Props = $props();

	// Rays around a disc, as the sun in the header draws them.
	const RAYS =
		'M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8';

	const options: { value: Theme; label: string }[] = [
		{ value: 'light', label: 'Light theme' },
		{ value: 'auto', label: 'Auto theme: match this device’s setting' },
		{ value: 'dark', label: 'Dark theme' }
	];
</script>

<SettingsSection id="appearance" title="Appearance" description="Theme">
	<!-- Not enhanced: a full reload re-renders the page in the new theme. -->
	<form class="form" method="POST" action="?/theme">
		{#if saved}<Notice tone="success">Theme saved.</Notice>{/if}
		<!-- Each sun saves its theme: outline for light, filled for dark, half of each for auto. -->
		<div class="suns" role="group" aria-label="Theme">
			{#each options as option (option.value)}
				<button
					type="submit"
					name="theme"
					value={option.value}
					class="sun"
					aria-label={option.label}
					aria-pressed={theme === option.value}
					title={option.label}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
						<path d={RAYS} />
						{#if option.value === 'auto'}<path class="fill" d="M12 7.5a4.5 4.5 0 0 0 0 9Z" />{/if}
						<circle class:fill={option.value === 'dark'} cx="12" cy="12" r="4.5" />
					</svg>
				</button>
			{/each}
		</div>
	</form>
</SettingsSection>

<style>
	.form {
		display: grid;
		gap: var(--space-4);
	}

	.suns {
		display: flex;
		gap: var(--space-5);
	}

	.sun {
		display: grid;
		place-items: center;
		padding: var(--space-0);
		border: 0;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.sun:hover,
	.sun[aria-pressed='true'] {
		color: var(--color-accent);
	}

	svg {
		width: var(--size-avatar-md);
		height: var(--size-avatar-md);
		fill: none;
		stroke: currentcolor;
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.fill {
		fill: currentcolor;
	}
</style>
