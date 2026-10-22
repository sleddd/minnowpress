import { error } from '@sveltejs/kit';
import { atomResponse } from '#lib/atom.ts';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { getChallenge } from '#lib/server/challenges.ts';
import { db } from '#lib/server/db/index.ts';
import { challengeFeed } from '#lib/server/feeds.ts';
import { paramInt } from '#lib/server/forms.ts';
import { storiesFeedXml } from '#lib/server/syndication.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const id = paramInt(params.id);
	const challenge = await getChallenge(db, id);
	if (!challenge) error(404, 'Challenge not found');
	const { items } = await challengeFeed(db, id);
	return atomResponse(
		storiesFeedXml({
			origin: PUBLIC_ORIGIN,
			appName: PUBLIC_APP_NAME,
			title: `Entries for “${challenge.title}”`,
			path: `/challenges/${id}`,
			items
		})
	);
};
