import { atomResponse } from '#lib/atom.ts';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { db } from '#lib/server/db/index.ts';
import { tagFeed } from '#lib/server/feeds.ts';
import { storiesFeedXml } from '#lib/server/syndication.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const tag = params.tag.toLowerCase();
	const { items } = await tagFeed(db, tag);
	return atomResponse(
		storiesFeedXml({
			origin: PUBLIC_ORIGIN,
			appName: PUBLIC_APP_NAME,
			title: `#${tag}`,
			path: `/tags/${encodeURIComponent(tag)}`,
			items
		})
	);
};
