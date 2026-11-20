import { expect, test } from '@playwright/test';
import { open, results, solveBoard, waitForBoard } from './helpers.js';

// A stand-in for the shared loader: it fills the box with an ad-sized element and
// adds the "Remove ads" link beside Privacy as the real one does, and nothing
// reaches the network.
const loader = (adFree = 'async () => false') => `window.ihtfyAds = { show(box) {
	(window.__shows ??= []).push(box.dataset.adSize);
	const aside = box.closest('aside');
	const privacy = [...aside.querySelectorAll('a[href]')].find((a) => a.pathname === '/privacy/');
	if (privacy && !aside.textContent.includes('Remove ads')) {
		const row = document.createElement('span');
		row.style.whiteSpace = 'nowrap';
		const link = privacy.cloneNode(false);
		link.href = 'https://ihtfy.com/ad-free/';
		link.textContent = 'Remove ads';
		privacy.replaceWith(row);
		row.append(privacy, ' · ', link);
	}
	const [w, h] = (box.dataset.adSize || '300x250').split('x');
	const ins = document.createElement('ins');
	ins.className = 'adsbygoogle';
	ins.style.cssText = 'display:inline-block;width:' + w + 'px;height:' + h + 'px';
	box.append(ins);
}, adFree: ${adFree} };`;

test.use({ serviceWorkers: 'block' });

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [adFree] the loader's purchase check, as source: a stand-in for the real one
 */
async function stubLoader(page, adFree) {
	/** @type {string[]} */
	const requested = [];
	await page.route('https://ihtfy.com/ads/v1.js', (route) => {
		requested.push(route.request().url());
		return route.fulfill({ contentType: 'text/javascript', body: loader(adFree) });
	});
	return requested;
}

/** Solves level 1 and waits for the results screen and its ad. */
async function finishLevel(/** @type {import('@playwright/test').Page} */ page) {
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await expect(page.locator('.ad-box ins.adsbygoogle')).toHaveCount(1);
}

/**
 * Positions, in CSS px, of the ad box and the gap to the nearest button, link, or input.
 * @param {import('@playwright/test').Page} page
 */
const measure = (page) =>
	page.evaluate(() => {
		const box = /** @type {HTMLElement} */ (document.querySelector('.ad-box'));
		const r = box.getBoundingClientRect();
		let gap = Infinity;
		for (const el of document.querySelectorAll('button, a[href], input')) {
			if (!el.getClientRects().length || box.contains(el)) continue;
			const c = el.getBoundingClientRect();
			const dx = Math.max(c.left - r.right, r.left - c.right, 0);
			const dy = Math.max(c.top - r.bottom, r.top - c.bottom, 0);
			gap = Math.min(gap, Math.hypot(dx, dy));
		}
		return {
			left: r.left,
			top: r.top,
			right: r.right,
			bottom: r.bottom,
			gap,
			size: box.dataset.adSize,
			boxes: document.querySelectorAll('.ad-box').length
		};
	});

/**
 * Records layout shifts that move the ad aside or anything in the results below it.
 * @param {import('@playwright/test').Page} page
 */
const watchShifts = (page) =>
	page.addInitScript(() => {
		/** @type {any} */ (window).__shifts = [];
		new PerformanceObserver((list) => {
			for (const e of /** @type {any[]} */ (list.getEntries()))
				if (!e.hadRecentInput)
					for (const s of e.sources) {
						const el = s.node?.nodeType === 1 ? s.node : s.node?.parentElement;
						if (el?.closest('.ad, .details'))
							/** @type {any} */ (window).__shifts.push(el.className || el.tagName);
					}
		}).observe({ type: 'layout-shift', buffered: true });
	});

const adShifts = (/** @type {import('@playwright/test').Page} */ page) =>
	page.evaluate(() => /** @type {any} */ (window).__shifts);

const SIZES = [
	{ width: 360, height: 640 },
	{ width: 390, height: 750 },
	{ width: 412, height: 800 },
	{ width: 1280, height: 800 }
];

for (const viewport of SIZES) {
	test(`${viewport.width}×${viewport.height}: the results ad, the result, and the main button are all in view`, async ({
		page
	}) => {
		await page.setViewportSize(viewport);
		const requested = await stubLoader(page);
		await open(page);
		await page.goto('/?adtest=on');
		// Nothing ad-related before a game ends, not even on the home screen.
		expect(requested).toEqual([]);
		await expect(page.locator('.ad-box')).toHaveCount(0);
		await finishLevel(page);

		const box = await measure(page);
		expect(box.boxes).toBe(1);
		expect(box.size).toBe('300x250');
		expect(box.left).toBeGreaterThanOrEqual(0);
		expect(box.right).toBeLessThanOrEqual(viewport.width);
		expect(box.top).toBeGreaterThanOrEqual(0);
		expect(box.bottom).toBeLessThanOrEqual(viewport.height);
		expect(box.gap).toBeGreaterThanOrEqual(50);
		await expect(page.getByText('Advertisements', { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Remove ads' })).toBeVisible();
		// The result and the main button are on screen without scrolling, above the box.
		for (const target of [results(page).getByRole('heading'), page.locator('.actions .primary')]) {
			const at = /** @type {NonNullable<Awaited<ReturnType<typeof target.boundingBox>>>} */ (
				await target.boundingBox()
			);
			expect(at.y).toBeGreaterThanOrEqual(0);
			expect(at.y + at.height).toBeLessThanOrEqual(box.top);
		}
		await expect(results(page).getByLabel('3 of 3 stars')).toBeVisible();
		// A screen, not a dialog or a pinned element.
		await expect(page.getByRole('dialog')).toHaveCount(0);
		expect(await page.locator('.ad').evaluate((el) => getComputedStyle(el).position)).toBe(
			'static'
		);
		// The play board is not showing: one ad on screen at a time.
		await expect(page.locator('[data-tube]').first()).toBeHidden();
		expect(requested).toEqual(['https://ihtfy.com/ads/v1.js']);
	});
}

test('the ad box causes no layout shift when it appears on the results screen', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 640 });
	await stubLoader(page);
	await watchShifts(page);
	await open(page);
	await finishLevel(page);
	await page.waitForTimeout(500);
	expect(await adShifts(page)).toEqual([]);
});

test('the home screen gets an ad after a game only where one fits', async ({ page }) => {
	await page.setViewportSize({ width: 412, height: 800 });
	await stubLoader(page);
	await watchShifts(page);
	await open(page);
	await finishLevel(page);
	await page.getByRole('button', { name: 'Levels' }).click();
	// The level map scrolls, so it gets none, and the results ad is gone with its screen.
	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
	await expect(page.locator('.ad-box')).toHaveCount(0);
	await page.getByRole('button', { name: 'Back' }).click();
	await expect(page.locator('.ad-box ins.adsbygoogle')).toHaveCount(1);
	const box = await measure(page);
	expect(box.size).toBe('320x50');
	expect(box.top).toBeGreaterThanOrEqual(0);
	expect(box.bottom).toBeLessThanOrEqual(800);
	expect(box.gap).toBeGreaterThanOrEqual(50);
	expect(await adShifts(page)).toEqual([]);
	// A dialog over the screen takes the ad away, and it does not come back for this game.
	await page.getByRole('button', { name: 'Help' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('.ad-box')).toHaveCount(0);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.locator('.ad-box')).toHaveCount(0);
});

test('the home screen gets no ad before a game ends', async ({ page }) => {
	const requested = await stubLoader(page);
	await page.setViewportSize({ width: 412, height: 800 });
	await open(page);
	await page.getByRole('button', { name: /Daily/ }).click();
	await expect(page.locator('.ad-box')).toHaveCount(0);
	await page.getByRole('button', { name: 'Home' }).click();
	await expect(page.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	await expect(page.locator('.ad-box')).toHaveCount(0);
	expect(requested).toEqual([]);
});

for (const viewport of SIZES.slice(0, 2)) {
	test(`${viewport.width}×${viewport.height}: the home screen after a game gets no box when no size fits`, async ({
		page
	}) => {
		await page.setViewportSize(viewport);
		await stubLoader(page);
		await open(page);
		await finishLevel(page);
		await page.getByRole('button', { name: 'Levels' }).click();
		await page.getByRole('button', { name: 'Back' }).click();
		await expect(page.locator('nav.links')).toBeVisible();
		await expect(page.locator('.ad-box')).toHaveCount(0);
		await expect(page.getByText('Advertisements')).toHaveCount(0);
	});
}

test('with the play ad beside the puzzle, the results screen adds no second box', async ({
	page
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await stubLoader(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await expect(page.locator('.ad-box')).toHaveCount(1);
	expect(await page.locator('.ad-box').getAttribute('data-ad-size')).toBe('300x600');
	await expect(results(page).locator('.ad-box')).toHaveCount(0);
});

test('no screen but the results screen and the home screen ever holds a box', async ({ page }) => {
	await page.setViewportSize({ width: 412, height: 800 });
	await stubLoader(page);
	await open(page);
	await finishLevel(page);
	for (const name of ['Levels']) await page.getByRole('button', { name }).click();
	await page.getByRole('button', { name: 'Back' }).click();
	for (const name of ['Shop', 'Stats', /^\d+\/\d+$/]) {
		await page.locator('nav.links').getByRole('button', { name }).click();
		await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
		await expect(page.locator('.ad-box')).toHaveCount(0);
		await page.getByRole('button', { name: 'Back' }).click();
	}
	await page.getByRole('button', { name: /Play|Continue/ }).click();
	await waitForBoard(page);
	await expect(page.locator('.ad-box')).toHaveCount(0);
});

test('a buyer gets no box and no reserved space', async ({ page }) => {
	await page.setViewportSize({ width: 412, height: 800 });
	await stubLoader(page, 'async () => true');
	await page.addInitScript(() => localStorage.setItem('ihtfy-ad-free', 'x.y.z'));
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await expect(page.locator('aside, .ad-box')).toHaveCount(0);
	await expect(page.getByText('Advertisements')).toHaveCount(0);
});

/** A purchase check that stays pending until the test settles it. */
const PENDING = `() => new Promise((resolve) => { window.__settle = resolve; })`;

/** @param {import('@playwright/test').Page} page */
const holdToken = (page) =>
	page.addInitScript(() => localStorage.setItem('ihtfy-ad-free', 'x.y.z'));

/** @param {import('@playwright/test').Page} page @param {boolean} free */
const settle = (page, free) =>
	page.evaluate((value) => /** @type {any} */ (window).__settle(value), free);

test('a token that fails the purchase check gets its results box once the check ends', async ({
	page
}) => {
	await page.setViewportSize({ width: 412, height: 800 });
	await stubLoader(page, PENDING);
	await holdToken(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	// While the check is pending the space stays collapsed.
	await expect(page.locator('aside, .ad-box')).toHaveCount(0);
	await settle(page, false);
	await expect(page.locator('.ad-box ins.adsbygoogle')).toHaveCount(1);
	expect((await measure(page)).bottom).toBeLessThanOrEqual(800);
});

test('a token that passes the purchase check keeps every box away', async ({ page }) => {
	await page.setViewportSize({ width: 412, height: 800 });
	await stubLoader(page, PENDING);
	await holdToken(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await settle(page, true);
	await page.waitForTimeout(300);
	await expect(page.locator('aside, .ad-box')).toHaveCount(0);
});

test('a token that fails the purchase check gets the ad beside the puzzle on a wide screen', async ({
	page
}) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await stubLoader(page, PENDING);
	await holdToken(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await expect(page.locator('aside, .ad-box')).toHaveCount(0);
	await settle(page, false);
	await expect(page.locator('.ad-box ins.adsbygoogle')).toHaveCount(1);
	expect(await page.locator('.ad-box').getAttribute('data-ad-size')).toBe('300x600');
});

test('turning a phone on its side hides a results box that no longer fits, and asks for no new one', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 568 });
	await stubLoader(page);
	await open(page);
	await finishLevel(page);
	expect((await measure(page)).size).toBe('320x100');
	await page.setViewportSize({ width: 568, height: 360 });
	await expect(page.locator('.ad')).toBeHidden();
	await expect(page.getByRole('button', { name: 'Next ›' })).toBeVisible();
	await page.setViewportSize({ width: 360, height: 568 });
	await expect(page.locator('.ad-box ins.adsbygoogle')).toBeVisible();
	expect(await page.evaluate(() => /** @type {any} */ (window).__shows)).toHaveLength(1);
});

test('a phone that finishes a level on its side gets the box when it is turned upright', async ({
	page
}) => {
	await page.setViewportSize({ width: 568, height: 320 });
	await stubLoader(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await expect(page.locator('.ad-box')).toHaveCount(0);
	await page.setViewportSize({ width: 360, height: 640 });
	await expect(page.locator('.ad-box ins.adsbygoogle')).toBeVisible();
	expect((await measure(page)).bottom).toBeLessThanOrEqual(640);
});

test('narrowing the window hides a box wider than it, and widening brings it back', async ({
	page
}) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await stubLoader(page);
	await open(page);
	await finishLevel(page);
	expect((await measure(page)).size).toBe('300x250');
	await page.setViewportSize({ width: 280, height: 800 });
	await expect(page.locator('.ad')).toBeHidden();
	await page.setViewportSize({ width: 360, height: 800 });
	await expect(page.locator('.ad-box ins.adsbygoogle')).toBeVisible();
	expect(await page.evaluate(() => /** @type {any} */ (window).__shows)).toHaveLength(1);
});

test('a results box never reaches past the column it sits in', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 568 });
	await stubLoader(page);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await page.waitForTimeout(300);
	for (const box of await page.locator('.ad-box').all()) {
		const r = /** @type {NonNullable<Awaited<ReturnType<typeof box.boundingBox>>>} */ (
			await box.boundingBox()
		);
		expect(r.x + r.width).toBeLessThanOrEqual(320 - 12);
	}
});

test('widening the results screen never shows two boxes', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await stubLoader(page);
	await open(page);
	await finishLevel(page);
	expect((await measure(page)).size).toBe('300x250');
	const visibleBoxes = () =>
		page.locator('.ad-box').evaluateAll((els) => els.filter((el) => el.getClientRects().length));
	await page.setViewportSize({ width: 1600, height: 800 });
	await expect(page.locator('.ad-box[data-ad-size="300x600"] ins.adsbygoogle')).toHaveCount(1);
	expect(await visibleBoxes()).toHaveLength(1);
	await expect(results(page).locator('.ad-box')).toHaveCount(0);
	await page.setViewportSize({ width: 1280, height: 800 });
	await expect(page.locator('.ad-box[data-ad-size="300x600"]')).toHaveCount(0);
	expect(await visibleBoxes()).toHaveLength(0);
});
