import { db } from '#lib/server/db/index.ts';
import { pageParam } from '#lib/server/forms.ts';
import { activeFeed, followingFeed, latestFeed, popularFeed } from '#lib/server/feeds.ts';
import type { PageServerLoad } from './$types';

const TABS = ['latest', 'popular', 'active', 'following'] as const;
type Tab = (typeof TABS)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('tab') as Tab;
	const tab: Tab =
		TABS.includes(requested) && (requested !== 'following' || locals.user) ? requested : 'latest';
	const page = pageParam(url.searchParams.get('page'));
	const opts = { viewer: locals.user, page };

	const feed =
		tab === 'popular'
			? await popularFeed(db, opts)
			: tab === 'active'
				? await activeFeed(db, opts)
				: tab === 'following' && locals.user
					? await followingFeed(db, locals.user.id, opts)
					: await latestFeed(db, opts);

	return { tab, feed };
};
