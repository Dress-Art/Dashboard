import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
	testDir: 'e2e',
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:3000',
		viewport: {width: 1280, height: 720},
		headless: true,
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	webServer: {
		command: 'npm run dev',
		port: 3000,
		reuseExistingServer: true,
		timeout: 120_000,
	},
	outputDir: 'test-results',
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']},
		},
	],
})
