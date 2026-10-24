<script lang="ts">
	import type { ReferralView } from '#lib/types.ts';
	import { Text, Timestamp } from '../../atoms/index.ts';
	import { EmptyState } from '../../molecules/index.ts';

	interface Props {
		referrals: ReferralView[];
	}

	let { referrals }: Props = $props();
</script>

<section class="referrals" aria-label="Referral codes">
	{#if referrals.length === 0}
		<EmptyState
			title="No visits yet"
			message="Share a link like /?ref=bookfair, on a QR code or anywhere else, and visits by it will be counted here."
		/>
	{:else}
		<div class="scroll">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">Link</th>
						<th scope="col" class="number">Visits</th>
						<th scope="col" class="number">Sign-ups</th>
						<th scope="col">First visit</th>
						<th scope="col">Last visit</th>
					</tr>
				</thead>
				<tbody>
					{#each referrals as referral (referral.code)}
						<tr>
							<th scope="row"><code>/?ref={referral.code}</code></th>
							<td class="number">{referral.visits}</td>
							<td class="number">{referral.signups}</td>
							<td
								>{#if referral.firstVisit}<Timestamp date={referral.firstVisit} />{/if}</td
							>
							<td
								>{#if referral.lastVisit}<Timestamp date={referral.lastVisit} />{/if}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Text size="sm" tone="muted">
			A visit counts once per browser per link. A sign-up is credited to the last link that browser
			arrived by.
		</Text>
	{/if}
</section>

<style>
	.referrals {
		display: grid;
		gap: var(--space-3);
	}

	.scroll {
		overflow-x: auto;
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	th,
	td {
		padding: var(--space-2) var(--space-4);
		border-bottom: var(--border-width) solid var(--color-border);
		text-align: left;
		white-space: nowrap;
	}

	thead th {
		color: var(--color-text-muted);
		font-weight: var(--weight-semibold);
	}

	tbody tr:last-child > * {
		border-bottom: none;
	}

	tbody th {
		font-weight: var(--weight-normal);
	}

	code {
		font-family: var(--font-mono);
	}

	.number {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
