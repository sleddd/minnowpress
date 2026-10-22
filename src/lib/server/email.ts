import { Resend } from 'resend';

export interface Email {
	to: string;
	subject: string;
	text: string;
	html: string;
}

export type SendEmail = (email: Email) => Promise<void>;

const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

export function magicLinkEmail(to: string, url: string, appName: string): Email {
	return {
		to,
		subject: `Your ${appName} sign-in link`,
		text: `Sign in to ${appName}:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
		html: `<p>Sign in to ${escapeHtml(appName)}:</p><p><a href="${escapeHtml(url)}">Sign in</a></p><p>This link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p>`
	};
}

export function resendSender(apiKey: string, from: string): SendEmail {
	const resend = new Resend(apiKey);
	return async (email) => {
		const { error } = await resend.emails.send({ from, ...email });
		if (error) throw new Error(`Email failed: ${error.message}`);
	};
}

/** Dev fallback: prints the email so the magic link can be clicked from the terminal. */
export function consoleSender(log: (msg: string) => void = console.log): SendEmail {
	return async (email) => log(`\n[email] to ${email.to}: ${email.subject}\n${email.text}\n`);
}

/**
 * Without a Resend key, dev prints emails to the console. Production refuses to send instead:
 * printing would put working sign-in links in the server logs, and nobody would get their email.
 */
export function createSender(
	apiKey: string | undefined,
	from: string,
	opts: { production?: boolean } = {}
): SendEmail {
	if (apiKey) return resendSender(apiKey, from);
	if (opts.production)
		return async () => {
			throw new Error('Email is not configured: set RESEND_API_KEY.');
		};
	return consoleSender();
}
