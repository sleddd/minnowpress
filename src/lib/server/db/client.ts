import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

export type DB = LibSQLDatabase<typeof schema>;

export function createDb(url: string, authToken?: string): DB {
	const client = createClient({ url, authToken });
	return drizzle(client, { schema });
}
