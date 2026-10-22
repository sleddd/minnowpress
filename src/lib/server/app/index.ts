import { dev } from '$app/env';
import { EMAIL_FROM, RESEND_API_KEY } from '$app/env/private';
import { PUBLIC_APP_NAME, PUBLIC_ORIGIN } from '$app/env/public';
import { createSender } from '../email';
import type { NotifyContext } from '../notifications';
import { relyingParty } from '../passkeys';

/** Env-wired services shared by routes. */
export const send = createSender(RESEND_API_KEY, EMAIL_FROM, { production: !dev });

export const notify: NotifyContext = { send, origin: PUBLIC_ORIGIN, appName: PUBLIC_APP_NAME };

/** Passkeys are bound to the canonical origin's hostname. */
export const rp = relyingParty(PUBLIC_ORIGIN, PUBLIC_APP_NAME);
