import { defineConfig, devices } from '@playwright/test';

const PORT = 4273;

export default defineConfig({
	testDir: './tests/browser',
	fullyParallel: true,
	workers: process.env.CI ? 2 : 4,
	reporter: 'list',
	use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
	projects: [
		{ name: 'chromium', use: { ...devices['Pixel 7'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{ name: 'webkit', use: { ...devices['iPhone 15'] } }
	],
	webServer: {
		command: `pnpm preview --host 127.0.0.1 --port ${PORT} --strictPort`,
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !process.env.CI
	}
});
