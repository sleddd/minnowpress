import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	DATABASE_URL: { description: 'libSQL URL: `libsql://…` for Turso, `file:local.db` for dev.' },
	DATABASE_AUTH_TOKEN: {
		description:
			'Auth token for the [Turso](https://turso.tech) database. Not needed for `file:` URLs.',
		schema: optional
	},
	// Amazon Bedrock, used only by the writing-prompt job (src/lib/server/prompts).
	// BEDROCK_-prefixed because Vercel reserves the standard AWS_* names.
	BEDROCK_AWS_ACCESS_KEY_ID: {
		description: 'IAM access key with bedrock:InvokeModel. Prompt suggestions are off when unset.',
		schema: optional
	},
	BEDROCK_AWS_SECRET_ACCESS_KEY: {
		description: 'Secret for BEDROCK_AWS_ACCESS_KEY_ID.',
		schema: optional
	},
	BEDROCK_AWS_REGION: {
		description: 'AWS region where the model is enabled, e.g. us-east-1.',
		schema: (value) => value || 'us-east-1'
	},
	BEDROCK_MODEL: {
		description: 'Bedrock model id for prompt suggestions.',
		schema: (value) => value || 'anthropic.claude-opus-5-5'
	},
	PUBLIC_ORIGIN: {
		description:
			'Canonical site origin, e.g. https://minnowpress.com. Used in emails, feeds, and passkeys.',
		public: true,
		schema: (value) => value || 'http://localhost:5173'
	},
	RESEND_API_KEY: {
		description: 'Sends magic-link emails. When unset, links are logged to the console (dev).',
		schema: optional
	},
	EMAIL_FROM: {
		description: 'From address for outgoing email.',
		schema: (value) => value || 'MinnowPress <hello@minnowpress.com>'
	},
	EMAIL_REPLY_TO: {
		description: 'Where replies to outgoing email go. Unset = replies go to EMAIL_FROM.',
		schema: optional
	},
	CRON_SECRET: {
		description: 'Vercel Cron sends this as a Bearer token to /api/cron/*.',
		schema: optional
	},
	ADMIN_EMAILS: {
		description: 'Comma-separated emails that are given the admin role on sign-up.',
		schema: (value) =>
			(value ?? '')
				.split(',')
				.map((e) => e.trim().toLowerCase())
				.filter(Boolean)
	},
	PUBLIC_APP_NAME: {
		description: 'Site name, shown in the header, titles and emails.',
		public: true,
		static: true,
		schema: (value) => value || 'MinnowPress'
	}
});
