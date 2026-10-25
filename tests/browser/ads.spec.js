import { expect, test } from '@playwright/test';
import { open, results, solveBoard, waitForBoard } from './helpers.js';

// A stand-in for the shared loader: it fills the box with an ad-sized element and
// adds the "Remove ads" link beside Privacy as the real one does, and nothing
// reaches the network.
const LOADER = `window.ihtfyAds = { show(box) {
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
}, adFree: async () => false };`;

test.use({ serviceWorkers: 'block' });

/** @param {import('@playwright/test').Page} page */
async function stubLoader(page) {
	/** @type {string[]} */
	const requested = [];
	await page.route('https://ihtfy.com/ads/v1.js', (route) => {
		requested.push(route.request().url());
		return route.fulfill({ contentType: 'text/javascript', body: LOADER });
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
	await stubLoader(page);
	await page.addInitScript(() => localStorage.setItem('ihtfy-ad-free', 'x.y.z'));
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
	await expect(page.locator('aside, .ad-box')).toHaveCount(0);
	await expect(page.getByText('Advertisements')).toHaveCount(0);
});
