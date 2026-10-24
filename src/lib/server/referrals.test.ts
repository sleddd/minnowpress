import { describe, expect, it, vi } from 'vitest';
import { referralVisits } from './db/schema';
import {
	listReferrals,
	parseReferralCode,
	recordReferral,
	REFERRAL_COOKIE,
	referralFromCookies
} from './referrals';
import { findOrCreateUserByEmail } from './users';
import { createTestDb } from './testing/db';

const browser =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function visit(path: string, jar = new Map<string, string>(), init: RequestInit = {}) {
	const url = new URL(path, 'http://localhost');
	return {
		url,
		request: new Request(url, { headers: { 'user-agent': browser }, ...init }),
		cookies: {
			get: (name: string) => jar.get(name),
			set: vi.fn((name: string, value: string) => void jar.set(name, value))
		}
	};
}

describe('parseReferralCode', () => {
	it('keeps short codes of letters, digits, - and _, lowercased', () => {
		expect(parseReferralCode('BookFair')).toBe('bookfair');
		expect(parseReferralCode(' fall-2026_card ')).toBe('fall-2026_card');
	});

	it('ignores anything else', () => {
		for (const raw of [null, undefined, '', '-lead', 'two words', '<script>', 'x'.repeat(41)])
			expect(parseReferralCode(raw), String(raw)).toBeNull();
	});
});

describe('recordReferral', () => {
	it('counts a visit once per browser per code and remembers the code', async () => {
		const db = await createTestDb();
		const jar = new Map<string, string>();
		await recordReferral(db, visit('/?ref=bookfair', jar), true);
		await recordReferral(db, visit('/?ref=bookfair', jar), true);
		await recordReferral(db, visit('/stories?ref=BookFair', jar), true);
		expect(await db.select().from(referralVisits)).toHaveLength(1);
		expect(jar.get(REFERRAL_COOKIE)).toBe('bookfair');

		await recordReferral(db, visit('/?ref=flyer', jar), true);
		expect(await db.select().from(referralVisits)).toHaveLength(2);
		expect(jar.get(REFERRAL_COOKIE)).toBe('flyer');
	});

	it('skips crawlers, form posts, bad codes and pages without one', async () => {
		const db = await createTestDb();
		const crawler = visit('/?ref=bookfair');
		crawler.request.headers.set('user-agent', 'Mozilla/5.0 (compatible; Googlebot/2.1)');
		await recordReferral(db, crawler, true);
		await recordReferral(db, visit('/?ref=bookfair', new Map(), { method: 'POST' }), true);
		await recordReferral(db, visit('/?ref=not%20a%20code'), true);
		await recordReferral(db, visit('/'), true);
		expect(await db.select().from(referralVisits)).toHaveLength(0);
	});

	it('never fails the request when the count can’t be saved', async () => {
		const db = await createTestDb();
		vi.spyOn(db, 'insert').mockImplementation(() => {
			throw new Error('database down');
		});
		const log = vi.fn();
		const event = visit('/?ref=bookfair');
		await expect(recordReferral(db, event, true, log)).resolves.toBeUndefined();
		expect(log).toHaveBeenCalledOnce();
		expect(event.cookies.set).not.toHaveBeenCalled();
	});
});

describe('listReferrals', () => {
	it('totals visits and sign-ups per code, most recently visited first', async () => {
		const db = await createTestDb();
		const jar = new Map<string, string>();
		await db.insert(referralVisits).values([
			{ code: 'flyer', createdAt: new Date('2026-09-01') },
			{ code: 'bookfair', createdAt: new Date('2026-10-01') },
			{ code: 'bookfair', createdAt: new Date('2026-10-02') }
		]);
		jar.set(REFERRAL_COOKIE, 'bookfair');
		await findOrCreateUserByEmail(db, 'reader@example.com', {
			referralCode: referralFromCookies(visit('/', jar).cookies)
		});
		await findOrCreateUserByEmail(db, 'other@example.com');

		expect(await listReferrals(db)).toEqual([
			{
				code: 'bookfair',
				visits: 2,
				signups: 1,
				firstVisit: new Date('2026-10-01'),
				lastVisit: new Date('2026-10-02')
			},
			{
				code: 'flyer',
				visits: 1,
				signups: 0,
				firstVisit: new Date('2026-09-01'),
				lastVisit: new Date('2026-09-01')
			}
		]);
	});
});
