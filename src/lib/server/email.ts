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

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Iowan Old Style','Times New Roman',serif";

/**
 * The wordmark as in the site header ("minnow" + italic teal "press"), led by the fish.
 * Email apps block SVG, so the fish is the PNG in static/, served from the link's own site.
 */
function emailLogo(url: string, appName: string): string {
	const split = /press$/i.test(appName) && appName.length > 5;
	const head = escapeHtml((split ? appName.slice(0, -5) : appName).toLowerCase());
	const tail = split ? `<em class="press">${escapeHtml(appName.slice(-5).toLowerCase())}</em>` : '';
	const fish = URL.canParse(url)
		? `<td style="padding-right:12px;vertical-align:middle;"><img src="${escapeHtml(new URL('/email-logo.png', url).href)}" width="40" height="40" alt="" style="display:block;border:0;border-radius:9px;"></td>`
		: '';
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${fish}<td class="word" style="vertical-align:middle;font-family:${SERIF};font-size:26px;font-weight:700;letter-spacing:-0.02em;color:#2a3335;">${head}${tail}</td></tr></table>`;
}

export function magicLinkEmail(to: string, url: string, appName: string): Email {
	const name = escapeHtml(appName);
	const link = escapeHtml(url);
	return {
		to,
		subject: `Your ${appName} sign-in link`,
		text: `Your key to ${appName}, as requested.\n\nSign in here:\n${url}\n\nGood for one use, good for 15 minutes. After that you can ask for a fresh one.\n\nDidn't request this? Nothing happened, and nothing will. Delete it and carry on.`,
		html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Sign in to ${name}</title>
<style>
	:root { color-scheme: light dark; supported-color-schemes: light dark; }
	body { margin:0; padding:0; width:100% !important; }
	a { text-decoration:none; }
	.press { color:#0e7477; font-weight:400; }
	@media (prefers-color-scheme: dark) {
		body, .wrap { background:#182022 !important; }
		.card { background:#1e2729 !important; color:#e6ece9 !important; }
		.word { color:#e6ece9 !important; }
		.press { color:#7cc2c3 !important; }
		.fine, .fallback { color:#a3b2b0 !important; }
		.btn { background:#7cc2c3 !important; color:#102022 !important; }
		.rule { border-top-color:#2f3c3f !important; }
	}
</style>
</head>
<body style="margin:0;padding:0;background:#f9f9f6;">
<div style="display:none;max-height:0;overflow:hidden;">Your one-tap sign-in link. Good for 15 minutes.</div>
<table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f9f6;">
	<tr><td align="center" style="padding:32px 12px;">
		<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:14px;color:#2a3335;font-family:${SERIF};">
			<tr><td style="padding:36px 36px 40px;">
				${emailLogo(url, appName)}
				<h1 style="font-size:26px;line-height:1.25;margin:28px 0 18px;font-weight:400;font-style:italic;">Your key, as requested.</h1>
				<p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Tap below and you're in. No password to remember, no account to recover at 2&nbsp;a.m.</p>
				<p style="margin:26px 0;"><a class="btn" href="${link}" style="display:inline-block;background:#0e7477;color:#ffffff;font-family:${SANS};font-size:16px;font-weight:600;padding:14px 30px;border-radius:8px;">Sign me in</a></p>
				<p class="fine" style="font-size:13px;line-height:1.6;margin:0 0 18px;color:#5b6769;">Good for one use, good for 15 minutes. After that it turns back into a pumpkin and you can ask for a fresh one.</p>
				<hr class="rule" style="border:0;border-top:1px dashed #d7ddd5;margin:28px 0 20px;">
				<p class="fine" style="font-size:13px;line-height:1.6;margin:0 0 18px;color:#5b6769;">Didn't request this? Nothing happened, and nothing will. Delete it and carry on.</p>
				<p class="fallback" style="font-size:12px;line-height:1.6;margin:0;color:#5b6769;word-break:break-all;">Button not cooperating? Paste this into your browser:<br>${link}</p>
			</td></tr>
		</table>
	</td></tr>
</table>
</body>
</html>`
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
