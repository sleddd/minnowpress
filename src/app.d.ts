// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from '#lib/server/db/schema.ts';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			/** Hash of the current session, to mark "this device" in Settings. */
			sessionId: string | null;
		}
	}
}

export {};
