import { toViewer } from '#lib/server/viewer.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({ viewer: toViewer(locals.user) });
