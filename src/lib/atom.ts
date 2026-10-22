/** Builds Atom 1.0 feeds (RFC 4287). Story text is sent as plain text, never as HTML. */

export interface AtomEntry {
	id: string;
	title: string;
	link: string;
	author: string;
	published: Date;
	content: string;
}

export interface AtomFeed {
	id: string;
	title: string;
	/** The HTML page this feed mirrors. */
	link: string;
	/** The feed's own URL. */
	self: string;
	updated: Date;
	entries: AtomEntry[];
}

export function escapeXml(value: string): string {
	return (
		value
			// Characters not allowed in XML 1.0
			// eslint-disable-next-line no-control-regex -- stripping these is the point
			.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
			.replace(
				/[&<>"']/g,
				(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!
			)
	);
}

export function buildAtomFeed(feed: AtomFeed): string {
	const updated = feed.entries.reduce(
		(latest, e) => (e.published > latest ? e.published : latest),
		feed.updated
	);
	const entries = feed.entries
		.map(
			(e) => `  <entry>
    <id>${escapeXml(e.id)}</id>
    <title>${escapeXml(e.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(e.link)}"/>
    <author><name>${escapeXml(e.author)}</name></author>
    <published>${e.published.toISOString()}</published>
    <updated>${e.published.toISOString()}</updated>
    <content type="text">${escapeXml(e.content)}</content>
  </entry>`
		)
		.join('\n');
	return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${escapeXml(feed.id)}</id>
  <title>${escapeXml(feed.title)}</title>
  <link rel="alternate" type="text/html" href="${escapeXml(feed.link)}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.self)}"/>
  <updated>${updated.toISOString()}</updated>
${entries}
</feed>
`;
}

export function atomResponse(xml: string): Response {
	return new Response(xml, {
		headers: {
			'content-type': 'application/atom+xml; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
}
