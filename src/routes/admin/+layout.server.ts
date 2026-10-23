import { redirect } from '@sveltejs/kit';
import { requireModerator } from '#lib/server/auth.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	// Staff who haven't passed two-step sign-in on this sign-in are sent to finish it first.
	if (locals.staffLock === 'verify')
		redirect(303, `/login/two-factor?next=${encodeURIComponent(url.pathname + url.search)}`);
	if (locals.staffLock === 'enroll') redirect(303, '/settings#two-factor');
	const user = requireModerator(locals.user);
	return { isAdmin: user.role === 'admin' };
};
