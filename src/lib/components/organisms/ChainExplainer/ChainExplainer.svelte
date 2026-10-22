<script lang="ts">
	import { Link } from '../../atoms/index.ts';
</script>

<aside class="explainer" aria-label="How prequels and sequels work">
	<div class="half">
		<p class="title">Prequels</p>
		<p>
			<strong>Oh no!</strong> This story doesn’t have a prequel. Want to fill in the blanks and write
			one?
		</p>
		<Link href="/browse">Write a prequel</Link>
	</div>
	<div class="half">
		<p class="title">Sequels</p>
		<p>
			<strong>Oh no!</strong> This story doesn’t have a sequel. Want to fill in the blanks and write one?
		</p>
		<Link href="/browse">Write a sequel</Link>
	</div>
</aside>

<style>
	.explainer {
		display: grid;
		grid-template-columns: 1fr 1fr;
		border: var(--border-width) dashed var(--color-border-strong);
	}

	.half {
		display: grid;
		gap: var(--space-3);
		align-content: start;
		padding: var(--space-5) var(--space-6);
	}

	.half + .half {
		border-left: var(--border-width) dashed var(--color-border-strong);
	}

	.title {
		color: var(--color-text-muted);
		font-size: var(--text-2xl);
		font-style: italic;
	}

	strong {
		color: var(--color-accent);
	}

	.half :global(a) {
		font-size: var(--text-lg);
		font-style: italic;
	}

	@media (max-width: 40rem) {
		.explainer {
			grid-template-columns: 1fr;
		}

		.half + .half {
			border-left: 0;
			border-top: var(--border-width) dashed var(--color-border-strong);
		}
	}
</style>
