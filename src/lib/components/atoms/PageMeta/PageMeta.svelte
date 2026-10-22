<script lang="ts">
	interface Props {
		/** Page title; the site name is appended. Omit on the home page. */
		title?: string;
		siteName: string;
		description?: string;
		/** For pages with secrets in the URL, like sign-in links. */
		noReferrer?: boolean;
		/** Atom feed for this page, advertised to feed readers. */
		feed?: { href: string; title: string };
	}

	let { title, siteName, description, noReferrer = false, feed }: Props = $props();
</script>

<svelte:head>
	<title>{title ? `${title} · ${siteName}` : siteName}</title>
	{#if description}<meta name="description" content={description} />{/if}
	{#if noReferrer}<meta name="referrer" content="no-referrer" />{/if}
	{#if feed}<link
			rel="alternate"
			type="application/atom+xml"
			title={feed.title}
			href={feed.href}
		/>{/if}
</svelte:head>
