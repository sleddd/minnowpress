import { atomResponse } from '#lib/atom.ts';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { db } from '#lib/server/db/index.ts';
import { latestFeed } from '#lib/server/feeds.ts';
import { storiesFeedXml } from '#lib/server/syndication.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const { items } = await latestFeed(db);
	return atomResponse(
		storiesFeedXml({
			origin: PUBLIC_ORIGIN,
			appName: PUBLIC_APP_NAME,
			title: 'Latest stories',
			path: '/',
			items
		})
	);
};
