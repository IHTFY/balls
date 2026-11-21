import { expect, test } from '@playwright/test';
import { open, results, solveBoard, tap, waitForBoard } from './helpers.js';

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

test('a win in one copy and a setting changed in another are both kept', async ({ context }) => {
	const playing = await context.newPage();
	await open(playing);
	await playing.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(playing);

	const other = await context.newPage();
	await open(other);
	await other.getByRole('button', { name: 'Settings' }).click();

	// Two real pages cannot fix which save lands first; tests/storage.test.js covers each order.
	await solveBoard(playing);
	await other.getByRole('switch', { name: 'Vibration' }).click();
	await expect.poll(async () => (await stored(other)).settings.haptics).toBe(false);
	await expect.poll(async () => (await stored(playing)).stars?.['1']).toBe(3);
	const saved = await stored(playing);
	expect(saved.unlocked).toBe(2);
	expect(saved.settings.haptics).toBe(false);
	await expect.poll(async () => (await stored(other)).stars?.['1']).toBe(3);
});

test('resetting progress in one copy restarts another that still shows a board', async ({
	context
}) => {
	const seed = { unlocked: 2, stars: { 1: 3 }, coins: 300 };
	const playing = await context.newPage();
	await open(playing, seed);
	await playing.getByRole('button', { name: /Play.*Level 2/ }).click();
	await waitForBoard(playing);
	await tap(playing, 0);

	const other = await context.newPage();
	await open(other, seed);
	await other.getByRole('button', { name: 'Settings' }).click();
	for (const label of ['Reset progress', 'Erase everything?', 'Really? Tap once more'])
		await other.getByRole('button', { name: label }).click();
	await expect(other.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();

	// The copy with the old board starts over too, and the old board is not saved again.
	await expect(playing.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	await hideAndClose(other);
	const saved = await stored(playing);
	expect(saved.unlocked).toBe(1);
	expect(saved.stars).toEqual({});
	expect(saved.coins).toBe(100);
	expect(saved.saved).toBeNull();

	// A board started after the reset saves as usual.
	await playing.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(playing);
	await tap(playing, 0);
	await expect.poll(async () => (await stored(playing)).saved?.level).toBe(1);
});

/** A player who has cleared a level and has not opened today's gift, so the prompt shows. */
const giftWaiting = {
	coins: 0,
	gift: { last: '2020-01-01', streak: 3 },
	stats: { solved: 1 },
	achievements: { first: '2026-01-01' }
};

test('a gift prompt closed without opening stays closed when another copy saves', async ({
	context
}) => {
	const page = await context.newPage();
	await open(page, giftWaiting);
	const prompt = page.getByRole('dialog', { name: 'Daily gift' });
	await expect(prompt).toBeVisible();
	await prompt.getByRole('button', { name: 'Close' }).click();
	await expect(prompt).toHaveCount(0);

	const other = await context.newPage();
	await other.goto('/');
	await other.evaluate(() => {
		const saved = JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}');
		saved.settings.sound = false;
		localStorage.setItem('balls.profile.v1', JSON.stringify(saved));
	});

	// Longer than the prompt waits to show.
	await page.waitForTimeout(1500);
	await expect(prompt).toHaveCount(0);
	// The save did reach this copy, and the gift is still there to open by hand.
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('switch', { name: 'Sound effects' })).not.toBeChecked();
	await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
	await page.getByRole('button', { name: 'Open your daily gift' }).click();
	await prompt.getByRole('button', { name: 'Open gift' }).click();
	await expect(prompt.getByRole('button', { name: 'Collect' })).toBeVisible();
});

test('a gift opened in one copy closes the gift prompt in another', async ({ context }) => {
	const first = await context.newPage();
	await open(first, giftWaiting);
	const second = await context.newPage();
	await open(second, giftWaiting);
	const prompt = second.getByRole('dialog', { name: 'Daily gift' });
	await expect(prompt).toBeVisible();

	await first.getByRole('button', { name: 'Open gift' }).click();
	await expect(first.getByRole('button', { name: 'Collect' })).toBeVisible();

	// The other copy has no gift left to open today.
	await expect(prompt).toHaveCount(0);
	await expect(second.getByRole('button', { name: 'Open your daily gift' })).toHaveCount(0);
	await expect(first.getByRole('button', { name: 'Collect' })).toBeVisible();
	expect((await stored(second)).coins).toBe(30);
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
