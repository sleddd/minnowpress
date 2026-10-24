<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Icon, Label, Select, Text, TextArea } from '../../atoms/index.ts';

	interface Props {
		/** Form action URL, e.g. "/s/12?/report". */
		action: string;
		targetType: 'story' | 'comment';
		targetId: number;
		/** Set after a successful report. */
		reported?: boolean;
	}

	let { action, targetType, targetId, reported = false }: Props = $props();

	const reasons = $derived([
		{ value: 'ai_generated', label: 'Suspected AI-generated' },
		...(targetType === 'story' ? [{ value: 'mature', label: 'Should be marked mature' }] : []),
		{ value: 'spam', label: 'Spam' },
		{ value: 'abuse', label: 'Abusive or harmful' },
		{ value: 'other', label: 'Something else' }
	]);
	const id = $derived(`report-${targetType}-${targetId}`);
</script>

<!--
	After a report the thanks shows in an already-open section (even when the page reloaded without
	JavaScript). Before that, `open` is left entirely to the browser, so a click that lands before the
	page finishes loading isn't undone.
-->
{#if reported}
	<details class="report" open>
		<summary><Icon name="flag" /> Report</summary>
		<Text tone="muted" size="sm">Thanks. A moderator will take a look.</Text>
	</details>
{:else}
	<details class="report">
		<summary><Icon name="flag" /> Report</summary>
		<form method="POST" {action} use:enhance class="form">
			<input type="hidden" name="targetType" value={targetType} />
			<input type="hidden" name="targetId" value={targetId} />
			<Label for="{id}-reason">Reason</Label>
			<Select id="{id}-reason" name="reason" options={reasons} />
			<Label for="{id}-note" optional>Note</Label>
			<TextArea id="{id}-note" name="note" rows={2} maxlength={500} />
			<div><Button type="submit" variant="secondary" size="sm">Send report</Button></div>
		</form>
	</details>
{/if}

<style>
	.report summary {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		cursor: pointer;
		list-style: none;
	}

	.report summary::-webkit-details-marker {
		display: none;
	}

	.form {
		display: grid;
		gap: var(--space-2);
		max-width: var(--measure);
		margin-top: var(--space-3);
	}
</style>
