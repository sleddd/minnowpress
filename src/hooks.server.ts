import { dev } from '$app/env';
import { db } from '#lib/server/db/index.ts';
import { createHandle } from '#lib/server/handle.ts';

export const handle = createHandle(db, { secure: !dev });
