<script lang="ts">
	import { Link, Notice } from '../../atoms/index.ts';

	interface Props {
		/** enroll: two-step sign-in isn't set up · verify: no code entered on this sign-in yet */
		lock: 'enroll' | 'verify';
		/** The current page, to come back to after the code step. */
		path: string;
	}

	let { lock, path }: Props = $props();
</script>

{#if !path.startsWith('/login/two-factor')}
	<div class="staff-lock">
		<Notice>
			{#if lock === 'verify'}
				Moderator and admin tools are locked on this sign-in.
				<Link href="/login/two-factor?next={encodeURIComponent(path)}"
					>Enter your authenticator code</Link
				> to unlock them.
			{:else}
				Moderator and admin tools stay locked until you
				<Link href="/settings#two-factor">set up two-step sign-in</Link>.
			{/if}
		</Notice>
	</div>
{/if}

<style>
	.staff-lock {
		margin-bottom: var(--space-5);
	}
</style>
