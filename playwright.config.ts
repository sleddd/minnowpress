import { defineConfig } from '@playwright/test';

const PORT = 4174;
export const E2E_DB = 'file:e2e.db';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	globalSetup: './e2e/global-setup.ts',
	workers: 1,
	use: { baseURL: `http://localhost:${PORT}` },
	webServer: {
		command: `vite dev --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: false,
		env: {
			SVELTEKIT_OUT_DIR: '.svelte-kit-e2e',
			DATABASE_URL: E2E_DB,
			DATABASE_AUTH_TOKEN: '',
			RESEND_API_KEY: '',
			BEDROCK_AWS_ACCESS_KEY_ID: '',
			BEDROCK_AWS_SECRET_ACCESS_KEY: '',
			PUBLIC_ORIGIN: `http://localhost:${PORT}`,
			CRON_SECRET: 'e2e-secret',
			ADMIN_EMAILS: 'admin@example.com',
			PUBLIC_APP_NAME: 'MinnowPress'
		}
	}
});
