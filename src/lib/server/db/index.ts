import { DATABASE_AUTH_TOKEN, DATABASE_URL } from '$app/env/private';
import { createDb } from './client';

export type { DB } from './client';

export const db = createDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
