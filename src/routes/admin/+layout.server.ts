import { requireModerator } from '#lib/server/auth.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const user = requireModerator(locals.user);
	return { isAdmin: user.role === 'admin' };
};
