import { describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('resend', () => ({
	Resend: class {
		emails = { send };
	}
}));

const { consoleSender, createSender, magicLinkEmail, resendSender } = await import('./email');

describe('magicLinkEmail', () => {
	it('includes the link in text and escaped html', () => {
		const email = magicLinkEmail('a@example.com', 'https://x.test/login/verify?token=a&b', 'Fic');
		expect(email.subject).toBe('Your Fic sign-in link');
		expect(email.text).toContain('https://x.test/login/verify?token=a&b');
		expect(email.html).toContain('href="https://x.test/login/verify?token=a&amp;b"');
	});

	it("shows the fish logo from the link's own site and the split wordmark", () => {
		const { html } = magicLinkEmail(
			'a@b.co',
			'https://minnow.test/login/verify?t=1',
			'MinnowPress'
		);
		expect(html).toContain('src="https://minnow.test/email-logo.png"');
		expect(html).toContain('minnow<em class="press">press</em>');
	});

	it('leaves the fish out when the link is not absolute', () => {
		const { html } = magicLinkEmail('a@b.co', 'u', 'Fic');
		expect(html).not.toContain('<img');
		expect(html).toContain('>fic</td>');
	});

	it('escapes the app name', () => {
		expect(magicLinkEmail('a@b.co', 'u', '<b>').html).toContain('&lt;b&gt;');
	});
});

describe('senders', () => {
	const email = magicLinkEmail('a@example.com', 'https://x.test', 'Fic');

	it('consoleSender logs the email', async () => {
		const log = vi.fn();
		await consoleSender(log)(email);
		expect(log.mock.calls[0][0]).toContain('https://x.test');
	});

	it('resendSender sends with the from address and throws on error', async () => {
		send.mockResolvedValueOnce({ data: { id: '1' }, error: null });
		await resendSender('key', 'Fic <hi@x.test>')(email);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ from: 'Fic <hi@x.test>', to: 'a@example.com' })
		);
		send.mockResolvedValueOnce({ data: null, error: { message: 'bad' } });
		await expect(resendSender('key', 'f')(email)).rejects.toThrow('Email failed: bad');
	});

	it('createSender picks Resend only when a key is set', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		await createSender(undefined, 'f')(email);
		expect(log).toHaveBeenCalled();
		log.mockRestore();
		send.mockResolvedValueOnce({ data: {}, error: null });
		send.mockClear();
		send.mockResolvedValueOnce({ data: {}, error: null });
		await createSender('key', 'f')(email);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('createSender refuses to send in production without a key, rather than logging links', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		await expect(createSender(undefined, 'f', { production: true })(email)).rejects.toThrow(
			'RESEND_API_KEY'
		);
		expect(log).not.toHaveBeenCalled();
		log.mockRestore();
	});
});
