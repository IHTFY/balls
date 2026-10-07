import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { open, solveBoard, waitForBoard } from './helpers.js';

const WORKER = new URL('../../dist/service-worker.js', import.meta.url);

/** @param {import('@playwright/test').Page} page */
async function waitForController(page) {
	await page.evaluate(() => navigator.serviceWorker.ready);
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('every precached file is served', async ({ request }) => {
	const source = await (await request.get('/service-worker.js')).text();
	const assets = JSON.parse(
		/** @type {RegExpMatchArray} */ (source.match(/const ASSETS = (\[[^\]]*\]);/))[1]
	);
	expect(assets).toContain('./');
	expect(assets).toContain('./manifest.webmanifest');
	expect(assets.some((/** @type {string} */ a) => /worker-.*\.js$/.test(a))).toBe(true);
	expect(assets.some((/** @type {string} */ a) => a.endsWith('.woff2'))).toBe(true);
	for (const asset of assets) expect((await request.get(asset)).status(), asset).toBe(200);
});

test('the game installs, then loads and plays with no network', async ({
	page,
	context,
	browserName
}) => {
	test.skip(
		browserName === 'webkit',
		'Playwright cannot emulate offline service workers in WebKit'
	);
	await page.goto('/');
	await waitForController(page);
	await context.setOffline(true);
	await page.reload();
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(page.getByRole('dialog')).toContainText('Level 1');
	// Puzzles come from the worker script, which must also load from the cache.
	await page.getByRole('button', { name: 'Next ›' }).click();
	await expect(page.locator('[data-state="playing"]')).toBeVisible();
});

test.describe('updates', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'One browser is enough to change the served files'
	);

	test('an installed app finds, downloads, and applies a new version in place', async ({
		page
	}) => {
		await open(page);
		await waitForController(page);
		await page.getByRole('button', { name: 'Settings' }).click();
		const build = page.getByText(/^Build /);
		await expect(build).toBeVisible();
		const before = /** @type {string} */ (await build.textContent()).replace('Build ', '');

		const original = await readFile(WORKER, 'utf8');
		// A same-length version keeps the static server's cached file size valid.
		const next = before.split('').reverse().join('');
		try {
			await writeFile(WORKER, original.replace(`"${before}"`, `"${next}"`));
			await page.getByRole('button', { name: 'Check for updates' }).click();
			await expect(page.getByRole('button', { name: 'Install update' })).toBeVisible();
			await page.getByRole('button', { name: 'Close' }).last().click();
			await expect(page.getByText('A new version is ready')).toBeVisible();
			const reloaded = page.waitForEvent('load');
			await page.getByRole('button', { name: 'Update', exact: true }).click();
			await reloaded;
			await page.getByRole('button', { name: 'Settings' }).click();
			await expect(page.getByText(`Build ${next}`)).toBeVisible();
		} finally {
			await writeFile(WORKER, original);
		}
	});
});

test('the page loads nothing from other sites and has no ads', async ({ page, baseURL }) => {
	const origin = new URL(/** @type {string} */ (baseURL)).origin;
	/** @type {string[]} */
	const outside = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin)
			outside.push(request.url());
	});
	/** @type {string[]} */
	const violations = [];
	page.on('console', (m) => {
		if (/Content Security Policy|Content-Security-Policy/i.test(m.text()))
			violations.push(m.text());
	});
	await open(page, { unlocked: 3 });
	await page.getByRole('button', { name: /Level 3/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(page.getByRole('dialog')).toContainText('Level 3');
	expect(outside).toEqual([]);
	expect(violations).toEqual([]);
	expect(
		await page
			.locator('script[src], iframe, ins.adsbygoogle')
			.evaluateAll((els) =>
				els
					.map((el) => el.getAttribute('src') ?? el.tagName)
					.filter((src) => !src.startsWith('./') && !src.startsWith('/'))
			)
	).toEqual([]);
});

test('the support link opens the support page in a new tab', async ({ page }) => {
	await open(page);
	const link = page.getByRole('link', { name: /Support/ });
	await expect(link).toHaveAttribute('href', 'https://ihtfy.com/support/');
	await expect(link).toHaveAttribute('target', '_blank');
});
