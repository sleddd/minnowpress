// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from '#lib/server/db/schema.ts';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			/** Hash of the current session, to mark "this device" in Settings. */
			sessionId: string | null;
			/**
			 * Set for staff whose staff powers are off on this sign-in: 'enroll' until they set up
			 * two-step sign-in, 'verify' until they enter a code. `user.role` reads 'user' meanwhile.
			 */
			staffLock: 'enroll' | 'verify' | null;
		}
	}
}

export {};
