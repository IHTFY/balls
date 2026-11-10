import { expect, test } from '@playwright/test';
import { open, results, solveBoard, waitForBoard } from './helpers.js';

/** @param {import('@playwright/test').Page} page */
const stored = (page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}'));

/**
 * Solves level 1 in `page` and waits for the result to be saved.
 * @param {import('@playwright/test').Page} page
 */
async function clearLevel1(page) {
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(results(page)).toContainText('Level 1');
	await expect.poll(async () => (await stored(page)).stars?.['1']).toBe(3);
}

/**
 * Sends the events a browser sends when a tab is switched away from and then closed.
 * @param {import('@playwright/test').Page} page
 */
async function hideAndClose(page) {
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
		window.dispatchEvent(new Event('pagehide'));
	});
	await page.close();
}

test('a second copy left open does not undo progress made in the first', async ({ context }) => {
	const idle = await context.newPage();
	await open(idle);
	await expect(idle.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();

	const playing = await context.newPage();
	await open(playing);
	await clearLevel1(playing);
	const { coins } = await stored(playing);
	expect(coins).toBeGreaterThan(100);
	await playing.close();

	await hideAndClose(idle);

	const later = await context.newPage();
	await later.goto('/');
	await expect(later.getByRole('button', { name: /Play.*Level 2/ })).toBeVisible();
	const saved = await stored(later);
	expect(saved.stars['1']).toBe(3);
	expect(saved.coins).toBe(coins);
});

test('a change in a second copy keeps progress made in the first', async ({ context }) => {
	const idle = await context.newPage();
	await open(idle);
	await expect(idle.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();

	const playing = await context.newPage();
	await open(playing);
	await clearLevel1(playing);
	await playing.close();

	// The other copy picks up the new level without a reload, then changes a setting.
	await expect(idle.getByRole('button', { name: /Play.*Level 2/ })).toBeVisible();
	await idle.getByRole('button', { name: 'Settings' }).click();
	await idle.getByRole('switch', { name: 'Sound effects' }).click();
	await expect.poll(async () => (await stored(idle)).settings.sound).toBe(false);
	await hideAndClose(idle);

	const later = await context.newPage();
	await later.goto('/');
	const saved = await stored(later);
	expect(saved.stars['1']).toBe(3);
	expect(saved.unlocked).toBe(2);
});

test('the home screen left open past midnight offers the new daily and gift', async ({ page }) => {
	await page.clock.install({ time: new Date('2026-10-22T23:58:00') });
	await open(page, {
		stats: { solved: 1 },
		achievements: { first: '2026-10-01' },
		daily: { done: { '2026-10-22': { moves: 20, stars: 3, seconds: 60 } }, streak: 1 }
	});
	const daily = page.getByRole('button', { name: /Daily/ });
	await expect(daily).toContainText('Done');
	await expect(page.getByRole('button', { name: 'Open your daily gift' })).toHaveCount(0);

	await page.clock.runFor(3 * 60_000);
	await expect(daily).toContainText('New puzzle today!');
	await expect(page.getByRole('button', { name: 'Open your daily gift' })).toBeVisible();
});

test('the home screen catches up on the date when the page comes back', async ({ page }) => {
	await page.clock.install({ time: new Date('2026-10-22T23:59:50') });
	await open(page, {
		daily: { done: { '2026-10-22': { moves: 20, stars: 3, seconds: 60 } }, streak: 1 }
	});
	const daily = page.getByRole('button', { name: /Daily/ });
	await expect(daily).toContainText('Done');
	// Past midnight, before the screen's own timer next runs.
	await page.clock.setSystemTime(new Date('2026-10-23T00:00:05'));
	await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
	await expect(daily).toContainText('New puzzle today!');
});
