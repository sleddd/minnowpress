<script lang="ts">
	interface Props {
		/** Page title; the site name is appended. Omit on the home page. */
		title?: string;
		siteName: string;
		description?: string;
		/**
		 * For pages with secrets in the URL, like sign-in links: the URL never leaves the site.
		 * Not no-referrer, which also blanks the Origin on the page's own form posts and fails
		 * the CSRF check.
		 */
		privateUrl?: boolean;
		/** Atom feed for this page, advertised to feed readers. */
		feed?: { href: string; title: string };
	}

	let { title, siteName, description, privateUrl = false, feed }: Props = $props();
</script>

<svelte:head>
	<title>{title ? `${title} · ${siteName}` : siteName}</title>
	{#if description}<meta name="description" content={description} />{/if}
	{#if privateUrl}<meta name="referrer" content="same-origin" />{/if}
	{#if feed}<link
			rel="alternate"
			type="application/atom+xml"
			title={feed.title}
			href={feed.href}
		/>{/if}
</svelte:head>
