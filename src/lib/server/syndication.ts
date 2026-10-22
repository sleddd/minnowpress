import { buildAtomFeed } from '#lib/atom.ts';
import type { FeedItem } from './feeds';

export interface StoriesFeedOptions {
	origin: string;
	appName: string;
	/** Feed title; the site name is appended. */
	title: string;
	/** Path of the HTML page this feed mirrors, e.g. "/tags/sea". */
	path: string;
	items: FeedItem[];
}

/** An Atom feed of stories. Imported archive stories are credited to their original authors. */
export function storiesFeedXml({
	origin,
	appName,
	title,
	path,
	items
}: StoriesFeedOptions): string {
	const link = `${origin}${path}`;
	return buildAtomFeed({
		id: `${link === `${origin}/` ? origin : link}/feed.xml`,
		title: `${title} · ${appName}`,
		link,
		self: `${link.replace(/\/$/, '')}/feed.xml`,
		updated: new Date(0),
		entries: items.map((s) => ({
			id: `${origin}/s/${s.id}`,
			title: s.title,
			link: `${origin}/s/${s.id}`,
			author: s.archive?.author ?? s.author.displayName,
			published: s.publishedAt ?? new Date(0),
			content: s.archive
				? `${s.body}\n\nOriginally published on Ficly (${s.archive.url}), CC BY-SA 3.0.`
				: s.body
		}))
	});
}
