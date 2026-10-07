import { expect, test } from '@playwright/test';
import { open, readBoard, solveBoard, tap, waitForBoard } from './helpers.js';

test('a new player solves level 1 and unlocks level 2', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await expect(page.getByText('Tap a tube to pick up its top ball')).toBeVisible();
	await solveBoard(page);
	await expect(page.getByRole('dialog')).toContainText('Level 1');
	await expect(page.getByRole('dialog').getByLabel('3 of 3 stars')).toBeVisible();
	await expect(page.getByText('First Sort')).toBeVisible();
	await page.getByRole('button', { name: 'Next ›' }).click();
	await expect(page.getByRole('heading', { name: 'Level 2' })).toBeVisible();
	await page.getByRole('button', { name: 'Home' }).click();
	await expect(page.getByRole('button', { name: /Level 2/ })).toBeVisible();
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}')
	);
	expect(saved.unlocked).toBe(2);
	expect(saved.stars['1']).toBe(3);
	expect(saved.coins).toBeGreaterThan(100);
});

test('moves follow the rules, and undo and restart rewind them', async ({ page }) => {
	await open(page, { unlocked: 6 });
	await page.getByRole('button', { name: /Level 6/ }).click();
	await waitForBoard(page);
	const before = await readBoard(page);
	const empty = before.tubes.findIndex((t) => t.length === 0);
	await tap(page, 0);
	await expect(page.locator('[data-tube="0"]')).toHaveAttribute('aria-pressed', 'true');
	await tap(page, empty);
	const after = await readBoard(page);
	expect(after.tubes[empty]).toEqual([before.tubes[0].at(-1)]);
	await expect(page.getByText('Moves').locator('..')).toContainText('1');

	await page.getByRole('button', { name: 'Undo' }).click();
	expect((await readBoard(page)).tubes).toEqual(before.tubes);

	await tap(page, 0);
	await tap(page, empty);
	await page.keyboard.press('Backspace');
	expect((await readBoard(page)).tubes).toEqual(before.tubes);

	await tap(page, 0);
	await tap(page, empty);
	await page.getByRole('button', { name: 'Restart' }).click();
	await page.waitForTimeout(900);
	expect((await readBoard(page)).tubes).toEqual(before.tubes);
});

test('a game in progress survives a reload', async ({ page }) => {
	await open(page, { unlocked: 4 });
	await page.getByRole('button', { name: /Level 4/ }).click();
	await waitForBoard(page);
	const { tubes } = await readBoard(page);
	const empty = tubes.findIndex((t) => t.length === 0);
	await tap(page, 1);
	await tap(page, empty);
	const moved = (await readBoard(page)).tubes;
	await page.reload();
	await page.getByRole('button', { name: /Continue.*Level 4/ }).click();
	await waitForBoard(page);
	expect((await readBoard(page)).tubes).toEqual(moved);
	await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

test('a hint points at a winning move and uses up one hint', async ({ page }) => {
	await open(page, { unlocked: 9, hints: 2 });
	await page.getByRole('button', { name: /Level 9/ }).click();
	await waitForBoard(page);
	await page.getByRole('button', { name: 'Hint, 2 left' }).click();
	await expect(page.locator('.hint-from')).toHaveCount(1);
	await expect(page.locator('.hint-to')).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'Hint, 1 left' })).toBeVisible();
});

test('an extra tube adds an empty tube', async ({ page }) => {
	await open(page, { unlocked: 5, tubes: 1 });
	await page.getByRole('button', { name: /Level 5/ }).click();
	await waitForBoard(page);
	const count = await page.locator('[data-tube]').count();
	await page.getByRole('button', { name: 'Add tube, 1 left' }).click();
	await expect(page.locator('[data-tube]')).toHaveCount(count + 1);
});

test('a stuck board says so', async ({ page }) => {
	// Two colors in two full tubes with no space: nothing can move.
	const ball = (/** @type {number} */ id, /** @type {number} */ color) => ({
		id,
		color,
		hidden: false
	});
	const start = [
		[ball(0, 0), ball(1, 1)],
		[ball(2, 1), ball(3, 0)]
	];
	await open(page, {
		unlocked: 3,
		saved: {
			mode: 'level',
			level: 3,
			seed: 1,
			colors: 2,
			boss: false,
			mystery: false,
			game: {
				start,
				tubes: start,
				history: [],
				capacity: 2,
				par: 3,
				moves: 0,
				seconds: 0,
				undos: 0,
				hintsUsed: 0,
				tubesAdded: 0,
				bestCombo: 0
			}
		}
	});
	await page.getByRole('button', { name: /Level 3/ }).click();
	await expect(page.getByRole('alert')).toContainText('No moves left');
});

test('blitz ends when the clock runs out', async ({ page }) => {
	await page.clock.install();
	// Reduced motion stops the particle loops, which would otherwise run every faked frame.
	await open(page, { settings: { music: false, reducedMotion: true } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(page.getByText('Solved').locator('..')).toContainText('1');
	// The clock pauses between boards; wait for the next one before running it out.
	await page.clock.runFor(1_000);
	await expect(page.locator('[data-state="playing"]')).toBeVisible();
	await page.clock.runFor(150_000);
	// Timers scheduled by the final tick need the clock to keep moving.
	await expect(async () => {
		await page.clock.runFor(500);
		await expect(page.getByRole('heading', { name: 'Time’s up!' })).toBeVisible({ timeout: 100 });
	}).toPass();
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}')
	);
	expect(saved.stats.blitzRuns).toBe(1);
	expect(saved.stats.blitzMostSolved).toBe(1);
});

test('the daily challenge pays once and builds a streak', async ({ page }) => {
	await open(page, { coins: 0 });
	await page.getByRole('button', { name: /Daily/ }).click();
	await expect(page.getByRole('heading', { name: 'Daily Challenge' })).toBeVisible();
	await waitForBoard(page);
	await solveBoard(page);
	await expect(page.getByRole('dialog')).toContainText('Streak');
	const saved = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}')
	);
	expect(saved.daily.streak).toBe(1);
	expect(saved.coins).toBeGreaterThanOrEqual(50);
});

test('the shop sells and equips a theme after a confirming tap', async ({ page }) => {
	await open(page, { coins: 1000 });
	await page.getByRole('button', { name: /Shop/ }).click();
	const card = page.locator('.card', { hasText: 'Deep Ocean' });
	await card.getByRole('button', { name: /300/ }).click();
	await card.getByRole('button', { name: 'Tap to confirm' }).click();
	await expect(card.getByRole('button', { name: /Equipped/ })).toBeVisible();
	await expect(page.locator('.coins').first()).toContainText('700');
	const vars = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--accent')
	);
	expect(vars.trim()).toBe('#3ff3d0');
});

test('a returning player opens a daily gift', async ({ page }) => {
	await open(page, {
		coins: 0,
		gift: { last: '2020-01-01', streak: 3 },
		stats: { solved: 1 },
		achievements: { first: '2026-01-01' }
	});
	await expect(page.getByRole('dialog', { name: 'Daily gift' })).toBeVisible();
	await page.getByRole('button', { name: 'Open gift' }).click();
	await expect(page.getByText('🪙 30')).toHaveCount(2);
	await page.getByRole('button', { name: 'Collect' }).click();
	await expect(page.locator('.coins').first()).toContainText('30');
});

test('a damaged save starts fresh and keeps a copy of the old data', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('balls.profile.v1', '{not json'));
	await page.goto('/');
	await expect(page.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	const kept = await page.evaluate(() => localStorage.getItem('balls.profile.v1.unreadable'));
	expect(kept).toBe('{not json');
});

test('a mystery level reveals balls as they are uncovered', async ({ page }) => {
	await open(page, { unlocked: 18 });
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await expect(page.locator('.tag', { hasText: 'Mystery' })).toBeVisible();
	const hidden = await page.locator('.ball.hidden').count();
	expect(hidden).toBeGreaterThan(0);
	const { tubes } = await readBoard(page);
	const empty = tubes.findIndex((t) => t.length === 0);
	await tap(page, 0);
	await tap(page, empty);
	await expect(page.locator('.ball.hidden')).toHaveCount(hidden - 1);
});

test('other modes do not show the daily date', async ({ page }) => {
	await open(page);
	await page.getByRole('button', { name: /Daily/ }).click();
	await waitForBoard(page);
	const date = /** @type {string} */ (await page.locator('.tags').textContent());
	expect(date).toMatch(/\d{4}-\d{2}-\d{2}/);
	await page.getByRole('button', { name: 'Home' }).click();
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await expect(page.locator('.tags')).not.toContainText(/\d{4}-\d{2}-\d{2}/);
});
