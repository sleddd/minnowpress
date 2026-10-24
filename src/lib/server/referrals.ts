import type { Cookies } from '@sveltejs/kit';
import { count, desc, isNotNull, max, min } from 'drizzle-orm';
import type { DB } from './db/client';
import { referralVisits, users } from './db/schema';
import { isCrawler } from './bots';

/**
 * Where people came from by ?ref= links, such as the QR code on a business card
 * (minnowpress.com/?ref=bookfair). A visit is counted once per visitor per code: the code is
 * kept in a cookie, so reloading the page or coming back later doesn't count again. A member
 * who signs up in that browser is credited to the code.
 */
export const REFERRAL_COOKIE = 'ref';
const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

/** Letters, digits, - and _, up to 40 characters; anything else is ignored. */
const CODE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function parseReferralCode(raw: string | null | undefined): string | null {
	const code = raw?.trim().toLowerCase();
	return code && CODE.test(code) ? code : null;
}

/**
 * Counts a visit by a ?ref= link, unless it's a crawler or this browser already counted it.
 * Never throws: a failed count shouldn't cost the visitor the page.
 */
export async function recordReferral(
	db: DB,
	event: { url: URL; request: Request; cookies: Pick<Cookies, 'get' | 'set'> },
	secure: boolean,
	log: (message: string, error: unknown) => void = console.error
): Promise<void> {
	if (event.request.method !== 'GET') return;
	const code = parseReferralCode(event.url.searchParams.get('ref'));
	if (!code || code === event.cookies.get(REFERRAL_COOKIE)) return;
	if (isCrawler(event.request.headers.get('user-agent'))) return;
	try {
		await db.insert(referralVisits).values({ code });
	} catch (e) {
		log('Referral visit not recorded', e);
		return;
	}
	event.cookies.set(REFERRAL_COOKIE, code, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: NINETY_DAYS_SECONDS
	});
}

/** The code a new member is credited to: the last ?ref= link they arrived by, if any. */
export function referralFromCookies(cookies: Pick<Cookies, 'get'>): string | null {
	return parseReferralCode(cookies.get(REFERRAL_COOKIE));
}

export interface ReferralStats {
	code: string;
	visits: number;
	signups: number;
	firstVisit: Date | null;
	lastVisit: Date | null;
}

/** Every code with its visits and sign-ups, most recently visited first. */
export async function listReferrals(db: DB): Promise<ReferralStats[]> {
	const [visitRows, signupRows] = await Promise.all([
		db
			.select({
				code: referralVisits.code,
				visits: count(),
				firstVisit: min(referralVisits.createdAt),
				lastVisit: max(referralVisits.createdAt)
			})
			.from(referralVisits)
			.groupBy(referralVisits.code)
			.orderBy(desc(max(referralVisits.createdAt))),
		db
			.select({ code: users.referralCode, signups: count() })
			.from(users)
			.where(isNotNull(users.referralCode))
			.groupBy(users.referralCode)
	]);
	const signups = new Map(signupRows.map((r) => [r.code, r.signups]));
	return visitRows.map((r) => ({ ...r, signups: signups.get(r.code) ?? 0 }));
}
