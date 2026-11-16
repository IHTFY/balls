import { expect, test } from '@playwright/test';
import { clock } from '../../src/lib/game/format.js';
import { scoreFor } from '../../src/lib/game/scoring.js';
import { solve } from '../../src/lib/game/solver.js';
import { open, readBoard, results, tap, waitForBoard } from './helpers.js';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
	await page.route('**/*', (route) =>
		new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
	);
	await page.clock.install();
});

/** @param {import('@playwright/test').Page} page */
async function startLevel(page) {
	await open(page, { settings: { music: false, reducedMotion: true, deadEnd: false } });
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	const { tubes } = await readBoard(page);
	await tap(page, 0);
	await tap(
		page,
		tubes.findIndex((tube) => tube.length === 0)
	);
}

/** @param {import('@playwright/test').Page} page */
const stored = (page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}'));

/** @param {import('@playwright/test').Page} page */
async function blitzLeft(page) {
	const text = await page.locator('.blitz-clock').innerText();
	const [minutes, seconds] = text.trim().split(':').map(Number);
	return minutes * 60 + seconds;
}

/** Completes the board at one clock instant. @param {import('@playwright/test').Page} page */
async function solveWithKeys(page) {
	const { tubes, capacity } = await readBoard(page);
	const solution = solve(tubes, capacity);
	expect(solution.status).toBe('solved');
	await page.evaluate((moves) => {
		for (const [from, to] of moves) {
			for (const tube of [from, to]) {
				window.dispatchEvent(new KeyboardEvent('keydown', { key: String(tube + 1) }));
			}
		}
	}, solution.moves ?? []);
}

test('reload keeps active time since the last move without writing every second', async ({
	page
}) => {
	await startLevel(page);
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
	const before = await stored(page);
	await page.clock.runFor(10_000);
	const text = await page
		.getByText('Time', { exact: true })
		.locator('..')
		.locator('strong')
		.innerText();
	const [minutes, seconds] = text.split(':').map(Number);
	const elapsed = minutes * 60 + seconds;
	expect(elapsed).toBeGreaterThanOrEqual(10);
	const idle = await stored(page);
	await page.reload();
	expect((await stored(page)).saved.game.seconds).toBe(elapsed);
	await page.clock.runFor(500);
	await page.getByRole('button', { name: /Continue.*Level 1/ }).click();
	await page.clock.runFor(500);
	await expect(page.getByText('Time', { exact: true }).locator('..').locator('strong')).toHaveText(
		clock(elapsed)
	);
	expect((await stored(page)).saved.game.seconds).toBeGreaterThanOrEqual(10);
	expect(idle.stats.seconds, 'clock-only changes wait for a lifecycle save').toBe(
		before.stats.seconds
	);
});

test('reload keeps the charged hint and its score penalty before another move', async ({
	page
}) => {
	await startLevel(page);
	await page.getByRole('button', { name: 'Hint, 3 left' }).click();
	await expect(page.getByRole('button', { name: 'Hint, 2 left' })).toBeVisible();
	await page.reload();
	const saved = await stored(page);
	expect(saved.hints).toBe(2);
	expect(saved.saved.game.hintsUsed).toBe(1);
	const game = saved.saved.game;
	const result = {
		colors: saved.saved.colors,
		capacity: game.capacity,
		moves: game.par,
		par: game.par,
		seconds: game.seconds,
		bestCombo: 0,
		undos: 0
	};
	expect(scoreFor({ ...result, hints: game.hintsUsed })).toEqual(scoreFor({ ...result, hints: 1 }));
	await page.getByRole('button', { name: /Continue.*Level 1/ }).click();
	await expect(page.getByRole('button', { name: 'Hint, 2 left' })).toBeVisible();
	await solveWithKeys(page);
	await page.clock.runFor(1500);
	await expect(results(page)).toBeVisible();
	await expect(results(page)).not.toContainText('Flawless');
});

test('visible Blitz time includes delayed timer callbacks', async ({ page }) => {
	await open(page, { settings: { music: false, reducedMotion: true, deadEnd: false } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	const before = await blitzLeft(page);
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBeLessThanOrEqual(before - 10);
});

test('Blitz excludes hidden time', async ({ page }) => {
	await open(page, { settings: { music: false, reducedMotion: true } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
	const before = await blitzLeft(page);
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBe(before);
	await page.evaluate(() => {
		Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBeLessThanOrEqual(before - 10);
});

test('Blitz excludes time in a settings dialog', async ({ page }) => {
	await open(page, { settings: { music: false, reducedMotion: true } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
	await page.getByRole('button', { name: 'Settings' }).click();
	const before = await blitzLeft(page);
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBe(before);
	await page
		.getByRole('dialog', { name: 'Settings' })
		.getByRole('button', { name: 'Close' })
		.click();
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBeLessThanOrEqual(before - 10);
});

test('Blitz starts its clock after loading finishes', async ({ page }) => {
	await open(page, { settings: { music: false, reducedMotion: true } });
	const loading = Promise.withResolvers();
	await page.route(/\/worker[^/]*\.js(?:\?.*)?$/, async (route) => {
		await loading.promise;
		await route.continue();
	});
	await page.getByRole('button', { name: /Blitz/ }).click();
	await expect(page.getByText('Mixing balls…')).toBeVisible();
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10_000));
	expect(await blitzLeft(page)).toBe(90);
	loading.resolve(undefined);
	await expect(page.locator('[data-state="playing"]')).toBeVisible();
	expect(await blitzLeft(page)).toBe(90);
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBe(80);
});

test('Blitz pauses between boards and resumes on the next board', async ({ page }) => {
	await open(page, { settings: { music: false, reducedMotion: true } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
	// Keep the win and the pause check at the same clock instant.
	await solveWithKeys(page);
	await expect(page.locator('[data-state="won"]')).toBeVisible();
	const before = await blitzLeft(page);
	await page.clock.runFor(500);
	expect(await blitzLeft(page)).toBe(before);
	await page.clock.runFor(500);
	await expect(page.locator('[data-state="playing"]')).toBeVisible();
	const resumed = await blitzLeft(page);
	await page.clock.fastForward(10_000);
	expect(await blitzLeft(page)).toBeLessThanOrEqual(resumed - 10);
});
