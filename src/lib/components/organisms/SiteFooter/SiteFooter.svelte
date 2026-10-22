<script lang="ts">
	import { Link, Text } from '../../atoms/index.ts';
</script>

<footer class="footer">
	<Text>
		Stories licensed <Link
			href="https://creativecommons.org/licenses/by-sa/4.0/"
			rel="license noopener">CC BY-SA</Link
		>. Written by people, not machines.
	</Text>
	<nav class="links" aria-label="Footer">
		<Link href="/about">About</Link>
		<Link href="/authors">Authors</Link>
		<Link href="/stories">Stories</Link>
		<Link href="/challenges">Challenges</Link>
		<Link href="/tags">Tags</Link>
		<Link href="/help">Help</Link>
		<Link href="/terms">Terms</Link>
	</nav>
</footer>

<style>
	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4) var(--space-6);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
	}
</style>
