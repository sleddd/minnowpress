import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const url = process.env.DATABASE_URL;
const local = url.startsWith('file:');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	// Turso in production and previews; a plain SQLite file for local dev.
	...(local
		? { dialect: 'sqlite' as const, dbCredentials: { url } }
		: {
				dialect: 'turso' as const,
				dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN }
			}),
	verbose: true,
	strict: true
});
