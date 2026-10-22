import { error } from '@sveltejs/kit';
import { atomResponse } from '#lib/atom.ts';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { db } from '#lib/server/db/index.ts';
import { authorFeed } from '#lib/server/feeds.ts';
import { storiesFeedXml } from '#lib/server/syndication.ts';
import { getUserByUsername } from '#lib/server/users.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = await getUserByUsername(db, params.username);
	if (!user) error(404, 'Writer not found');
	const { items } = await authorFeed(db, user.id);
	return atomResponse(
		storiesFeedXml({
			origin: PUBLIC_ORIGIN,
			appName: PUBLIC_APP_NAME,
			title: `Stories by ${user.displayName}`,
			path: `/@${user.username}`,
			items
		})
	);
};
