<script lang="ts">
	import { formatDate, formatRelative, toDate } from '#lib/format.ts';

	interface Props {
		date: Date | string | number;
		relative?: boolean;
		now?: Date;
	}

	let { date, relative = true, now = new Date() }: Props = $props();

	const value = $derived(toDate(date));
</script>

<time class="time" datetime={value.toISOString()} title={value.toUTCString()}>
	{relative ? formatRelative(value, now) : formatDate(value, now)}
</time>

<style>
	.time {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
	}
</style>
