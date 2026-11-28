import { expect, test } from '@playwright/test';
import { generatePuzzle } from '../../src/lib/game/generator.js';
import { dailySeed, dailySpec, levelSpec } from '../../src/lib/game/levels.js';
import { open, readBoard, results, solveBoard, tap, waitForBoard } from './helpers.js';

/**
 * The element's box in CSS px.
 * @param {import('@playwright/test').Locator} locator
 */
async function boxOf(locator) {
	const box = await locator.boundingBox();
	expect(box, 'the element is on the page').not.toBeNull();
	return /** @type {NonNullable<typeof box>} */ (box);
}

test('a new player solves level 1 and unlocks level 2', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await expect(page.getByText('Tap a tube to pick up its top ball')).toBeVisible();
	await solveBoard(page);
	await expect(results(page)).toContainText('Level 1');
	await expect(results(page).getByLabel('3 of 3 stars')).toBeVisible();
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

/**
 * A saved game on `level` before any move. Balls are [color, hidden] pairs, bottom to top. The
 * colors `board` leaves out are added as finished tubes, then empty tubes up to the level's count.
 * @param {number} level
 * @param {[number, boolean][][]} board
 */
function levelSave(level, board) {
	const spec = levelSpec(level);
	const used = new Set(board.flat().map(([color]) => color));
	const tubes = [...board];
	for (let color = 0; color < spec.colors; color++)
		if (!used.has(color)) tubes.push(Array.from({ length: spec.capacity }, () => [color, false]));
	while (tubes.length < spec.colors + spec.empty) tubes.push([]);
	let id = 0;
	const start = tubes.map((tube) => tube.map(([color, hidden]) => ({ id: id++, color, hidden })));
	return {
		mode: 'level',
		level,
		seed: 1,
		colors: spec.colors,
		boss: spec.boss,
		mystery: spec.mystery,
		game: {
			start,
			tubes: start,
			history: [],
			capacity: spec.capacity,
			par: 6,
			moves: 0,
			seconds: 0,
			undos: 0,
			hintsUsed: 0,
			tubesAdded: 0,
			bestCombo: 0
		}
	};
}

/**
 * A saved game with every ball in view.
 * @param {number} level
 * @param {number[][]} board colors, bottom to top
 */
function openSave(level, board) {
	return levelSave(
		level,
		board.map((tube) => tube.map((c) => /** @type {[number, boolean]} */ ([c, false])))
	);
}

/**
 * Level 39 one move into a dead end: its last move put a 7 from tube 10 onto tube 11. Now the
 * full tubes all end in color 9, and every other top is a color no other tube ends in.
 */
function stuckSave() {
	const saved = openSave(39, [
		[8, 8, 8, 9],
		[8, 0, 0, 9],
		[0, 1, 1, 9],
		[1, 2, 2, 9],
		[2, 3, 0],
		[3, 3, 1],
		[4, 4, 2],
		[4, 5, 3],
		[5, 5, 4],
		[6, 6, 5],
		[6, 7, 6, 7],
		[7, 7]
	]);
	const tubes = saved.game.start.map((tube) => [...tube]);
	tubes[11].push(...tubes[10].splice(-1));
	return {
		...saved,
		game: { ...saved.game, tubes, history: [{ from: 10, to: 11, count: 1 }], moves: 1 }
	};
}

test('a stuck board says so', async ({ page }) => {
	await open(page, { unlocked: 39, saved: stuckSave() });
	await page.getByRole('button', { name: /Level 39/ }).click();
	await expect(page.getByRole('alert')).toContainText('No moves left');
});

test('the stuck banner lets taps through to the tubes under it', async ({ page }) => {
	await open(page, { unlocked: 39, saved: stuckSave() });
	await page.getByRole('button', { name: /Level 39/ }).click();
	const banner = page.getByRole('alert');
	await expect(banner).toContainText('No moves left');
	// The banner's slide-in has to finish before its position is final.
	await page.waitForTimeout(500);
	const box = await boxOf(banner);
	const hit = await page.evaluate(
		({ x, y }) => document.elementFromPoint(x, y)?.closest('[role="alert"]') !== null,
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 }
	);
	expect(hit, 'a tap on the banner would not reach what is under it').toBe(false);
});

for (const [name, profile] of /** @type {const} */ ([
	['a new player', {}],
	['the top rank with a five-digit coin count', { score: 3e6, coins: 12345 }]
])) {
	test(`the home top row fits a 320 px screen for ${name}`, async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 640 });
		await open(page, profile);
		const rank = page.getByRole('button', { name: /^Rank / });
		await expect(rank).toBeVisible();
		const settings = await boxOf(page.getByRole('button', { name: 'Settings' }));
		const coins = await boxOf(page.locator('.top-right > :first-child'));
		const rankBox = await boxOf(rank);
		expect(settings.x + settings.width).toBeLessThanOrEqual(320);
		expect(coins.x + coins.width).toBeLessThanOrEqual(settings.x);
		expect(rankBox.x + rankBox.width).toBeLessThanOrEqual(coins.x);
	});
}

test('blitz plays its own music loop', async ({ page }) => {
	/** @type {string[]} */
	const loops = [];
	page.on('request', (r) => {
		const m = r.url().match(/music-(\w+)-/);
		if (m) loops.push(m[1]);
	});
	await open(page, { settings: { music: true } });
	await page.getByRole('button', { name: /Blitz/ }).click();
	await waitForBoard(page);
	await expect.poll(() => loops).toContain('blitz');
	expect(loops).not.toContain('play');
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
	// Fridays are mystery boards, so the test needs the dealt board to solve it.
	test.setTimeout(120_000);
	const date = '2026-10-23';
	await page.clock.setFixedTime(new Date(`${date}T12:00:00`));
	await open(page, { coins: 0 });
	await page.getByRole('button', { name: /Daily/ }).click();
	await expect(page.getByRole('heading', { name: 'Daily Challenge' })).toBeVisible();
	await waitForBoard(page);
	await solveBoard(page, generatePuzzle(dailySpec(date), dailySeed(date)).tubes);
	await expect(results(page)).toContainText('Streak');
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
	// A tap right after the first is a double tap, not a confirmation.
	await page.waitForTimeout(500);
	await card.getByRole('button', { name: 'Tap to confirm' }).click();
	await expect(card.getByRole('button', { name: /Equipped/ })).toBeVisible();
	await expect(page.locator('.coins').first()).toContainText('700');
	const vars = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue('--accent')
	);
	expect(vars.trim()).toBe('#3ff3d0');
});

test('a quick double tap on a shop price does not buy it', async ({ page }) => {
	await open(page, { coins: 1000 });
	await page.getByRole('button', { name: /Shop/ }).click();
	const card = page.locator('.card', { hasText: 'Deep Ocean' });
	const price = card.getByRole('button', { name: /300/ });
	// Two taps in the same frame land well inside the confirming tap's delay.
	await price.evaluate((button) => {
		const tap = /** @type {HTMLElement} */ (button);
		tap.click();
		tap.click();
	});
	await expect(card.getByRole('button', { name: 'Tap to confirm' })).toBeVisible();
	await expect(page.locator('.coins').first()).toContainText('1,000');
	await page.waitForTimeout(500);
	await card.getByRole('button', { name: 'Tap to confirm' }).click();
	await expect(card.getByRole('button', { name: /Equipped/ })).toBeVisible();
});

test('a dark theme drops the panel colors a light theme set', async ({ page }) => {
	await open(page, { owned: ['midnight', 'glossy', 'candy'], theme: 'candy' });
	const well = () =>
		page.evaluate(() =>
			getComputedStyle(document.documentElement).getPropertyValue('--well').trim()
		);
	expect(await well()).toBe('rgb(255 255 255 / 0.55)');
	await page.getByRole('button', { name: /Shop/ }).click();
	await page
		.locator('.card', { hasText: 'Midnight' })
		.getByRole('button', { name: /Equip/ })
		.click();
	await expect(page.locator('.card', { hasText: 'Midnight' })).toContainText('Equipped');
	// The same as Midnight on a fresh load.
	const switched = await well();
	await page.reload();
	await expect(page.getByRole('button', { name: /Play.*Level 1/ })).toBeVisible();
	expect(switched).toBe(await well());
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
	// Day 1 in the week strip and the reward itself.
	await expect(page.getByRole('dialog').getByLabel('30 coins', { exact: true })).toHaveCount(2);
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

test('move stacks never lifts hidden balls, even when they match', async ({ page }) => {
	await open(page, {
		unlocked: 18,
		settings: { music: false, stacks: true },
		saved: levelSave(18, [
			[
				[1, true],
				[0, true],
				[0, true],
				[0, false]
			],
			[
				[1, true],
				[1, true],
				[1, true],
				[0, false]
			],
			[]
		])
	});
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await tap(page, 0);
	await expect(page.locator('.ball-slot.up')).toHaveCount(1);
	await tap(page, 2);
	expect((await readBoard(page)).tubes[2]).toEqual([0]);
});

test('finishing a tube reveals the hidden balls inside it', async ({ page }) => {
	await open(page, {
		unlocked: 18,
		saved: levelSave(18, [
			[
				[1, true],
				[0, false]
			],
			[
				[0, true],
				[0, true],
				[0, false]
			],
			[
				[1, true],
				[1, true],
				[1, false]
			],
			[]
		])
	});
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await expect(page.locator('.ball.hidden')).toHaveCount(5);
	await tap(page, 0);
	await tap(page, 1);
	// The uncovered ball in tube 1 and both hidden balls in the finished tube 2.
	await expect(page.locator('.ball.hidden')).toHaveCount(2);
	expect((await readBoard(page)).tubes[1]).toEqual([0, 0, 0, 0]);
});

test('keyboard focus stays inside Settings, so Restart cannot be pressed behind it', async ({
	page
}) => {
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await page.keyboard.press('1');
	await page.keyboard.press('3');
	await expect(page.getByText('Moves', { exact: true }).locator('..')).toContainText('1');

	await page.getByRole('button', { name: 'Settings' }).focus();
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog', { name: 'Settings' });
	await expect(dialog).toBeVisible();
	/** The focused control, named by where it sits among the dialog's controls (-1 outside it). */
	const focused = () =>
		dialog.evaluate((el) => {
			const stops = [...el.querySelectorAll('button, input, a[href]')].filter(
				(c) => /** @type {HTMLElement} */ (c).tabIndex >= 0
			);
			return {
				at: stops.indexOf(/** @type {Element} */ (document.activeElement)),
				of: stops.length
			};
		});
	const start = await focused();
	expect(start.of).toBeGreaterThan(2);
	expect(start.at).toBe(0);
	// Tab visits every control once and comes back to the first.
	const forward = [];
	for (let i = 0; i < start.of; i++) {
		await page.keyboard.press('Tab');
		forward.push((await focused()).at);
	}
	expect(forward).toEqual([...Array(start.of - 1).keys()].map((i) => i + 1).concat(0));
	// Shift+Tab from the first goes to the last, and back down.
	await page.keyboard.press('Shift+Tab');
	expect((await focused()).at).toBe(start.of - 1);
	await page.keyboard.press('Shift+Tab');
	expect((await focused()).at).toBe(start.of - 2);
	await page.keyboard.press('Enter');
	await expect(page.getByText('Moves', { exact: true }).locator('..')).toContainText('1');
});

test('focus stays in How to play when it replaces Settings, then returns to the toolbar', async ({
	page
}) => {
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	const opener = page.getByRole('button', { name: 'Settings' });
	await opener.focus();
	await page.keyboard.press('Enter');
	const settings = page.getByRole('dialog', { name: 'Settings' });
	await settings.getByRole('button', { name: 'How to play' }).focus();
	await page.keyboard.press('Enter');
	const help = page.getByRole('dialog', { name: 'How to play' });
	await expect(help).toBeVisible();
	// Settings has finished fading out, which is when it used to take focus back to the toolbar.
	await expect(settings).toHaveCount(0);
	await expect(help.getByRole('button', { name: 'Close' })).toBeFocused();
	// Enter closes How to play instead of pressing the Settings button behind it.
	await page.keyboard.press('Enter');
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(opener).toBeFocused();
});

test('the back button steps back through the app instead of leaving it', async ({ page }) => {
	// A page before the game, for Back to leave to.
	await page.goto('/icons/icon-192.png');
	await open(page, { unlocked: 4 });
	const url = page.url();
	await page.getByRole('button', { name: /Levels/ }).click();
	await page.getByRole('button', { name: /^Level 3,/ }).click();
	await waitForBoard(page);
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

	await page.goBack();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Level 3' })).toBeVisible();
	await page.goBack();
	await expect(page.getByRole('heading', { name: 'Levels' })).toBeVisible();
	await page.goBack();
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
	expect(page.url()).toBe(url);

	// Coming home with the app's own buttons leaves no extra step behind.
	await page.getByRole('button', { name: 'Shop' }).click();
	// Let the app drop its own history entry before pressing Back.
	const dropped = page.evaluate(
		() => new Promise((resolve) => addEventListener('popstate', resolve, { once: true }))
	);
	await page.getByRole('button', { name: 'Back' }).click();
	await dropped;
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/icon-192\.png$/);
});

test('reloading during play leaves no extra step in the back history', async ({ page }) => {
	await page.goto('/icons/icon-192.png');
	await open(page, { unlocked: 4 });
	await page.getByRole('button', { name: /Level 4/ }).click();
	await waitForBoard(page);
	const { tubes } = await readBoard(page);
	await tap(page, 1);
	await tap(
		page,
		tubes.findIndex((t) => t.length === 0)
	);
	await page.reload();
	await expect(page.getByRole('button', { name: /Continue.*Level 4/ })).toBeVisible();
	await page.waitForFunction(() => !history.state?.guard);
	// A second reload at home does not drop the entry that backs out of the app.
	await page.reload();
	await expect(page.getByRole('button', { name: /Continue.*Level 4/ })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/icon-192\.png$/);
});

test('navigating right after a reload during a dialog still steps back to home, then leaves', async ({
	page
}) => {
	await page.goto('/icons/icon-192.png');
	await open(page, { unlocked: 4 });
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.reload();
	// Tap away from home immediately, without waiting for the reload's history drop.
	await page.getByRole('button', { name: /Level 4/ }).click();
	await waitForBoard(page);
	await page.waitForFunction(() => Boolean(history.state?.guard));
	await page.goBack();
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/icon-192\.png$/);
});

test('forward from home skips past a leftover guard entry to reach a later cross-origin page', async ({
	page
}) => {
	await page.route('https://example.test/**', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Later</title>' })
	);
	await page.goto('/icons/icon-192.png');
	await open(page, { unlocked: 4 });
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await page.goto('https://example.test/later');
	await page.goBack();
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
	await page.waitForFunction(() => !history.state?.guard);
	await page.goForward();
	await expect(page).toHaveURL('https://example.test/later');
});

test('a guard entry at the start of history with a later page clears instead of wedging Back', async ({
	page
}) => {
	await open(page, { unlocked: 4 });
	await page.evaluate(() => history.replaceState({ guard: true }, ''));
	await page.goto('/icons/icon-512.png');
	await page.goBack();
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
	await page.waitForFunction(() => !history.state?.guard);
	await page.getByRole('button', { name: /Level 4/ }).click();
	await waitForBoard(page);
	await page.waitForFunction(() => Boolean(history.state?.guard));
	await page.goBack();
	await expect(page.getByRole('button', { name: /Play.*Level 4/ })).toBeVisible();
});

test('a picked-up ball lights up the tubes it can go to', async ({ page }) => {
	await open(page, { unlocked: 18, saved: openSave(18, [[0, 1], [1, 1, 1], [0, 0, 0], []]) });
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await expect(page.locator('.tube.target')).toHaveCount(0);
	await tap(page, 0);
	await expect(page.locator('.tube.target')).toHaveCount(2);
	await expect(page.locator('[data-tube="1"]')).toHaveClass(/target/);
	await expect(page.locator('[data-tube="3"]')).toHaveClass(/target/);
});

test('with only-move drop on, a ball with one place to go drops there', async ({ page }) => {
	// Level 46 has a single empty tube, so this board has none.
	await open(page, {
		unlocked: 46,
		settings: { music: false, autoMove: true },
		saved: openSave(46, [
			[0, 1],
			[1, 1, 1],
			[0, 0, 0]
		])
	});
	await page.getByRole('button', { name: /Level 46/ }).click();
	await waitForBoard(page);
	await tap(page, 0);
	await expect(page.getByText('Only move')).toBeVisible();
	expect((await readBoard(page)).tubes[1]).toEqual([1, 1, 1, 1]);
	await tap(page, 0);
	await expect(results(page)).toContainText('Level 46');
});

test('only-move drop ignores an empty tube a one-color tube has no reason to use', async ({
	page
}) => {
	await open(page, {
		unlocked: 18,
		settings: { music: false, autoMove: true },
		saved: openSave(18, [[1], [1, 1, 1], [0, 0, 0, 0], []])
	});
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await tap(page, 0);
	await expect(results(page)).toContainText('Level 18');
});

test('with auto-finish on, the game plays out the matching moves left', async ({ page }) => {
	await open(page, {
		unlocked: 18,
		settings: { music: false, autoFinish: true },
		saved: openSave(18, [[0, 1], [1, 1, 1], [0, 0, 0], []])
	});
	await page.getByRole('button', { name: /Level 18/ }).click();
	await waitForBoard(page);
	await tap(page, 0);
	await tap(page, 3);
	await expect(page.getByText('Only moves left')).toBeVisible();
	await expect(results(page)).toContainText('Level 18');
	await expect(results(page).getByText('Moves').locator('..')).toContainText('3');
});

test('decorative loops pause after 15 seconds without input and resume on input', async ({
	page
}) => {
	await page.clock.install();
	await page.goto('/');
	const app = page.locator('.app');
	const looping = () =>
		page.evaluate(
			() =>
				document
					.getAnimations()
					.filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
					.length
		);
	await expect(app).not.toHaveClass(/idle/);
	expect(await looping()).toBeGreaterThan(0);

	await page.clock.fastForward(16000);
	await expect(app).toHaveClass(/idle/);
	expect(await looping()).toBe(0);

	await page.keyboard.press('Shift');
	await expect(app).not.toHaveClass(/idle/);
	expect(await looping()).toBeGreaterThan(0);
});

test('the page lets people zoom', async ({ page }) => {
	await open(page);
	const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
	expect(viewport).not.toMatch(/user-scalable|maximum-scale/);
});

const zoom = (/** @type {import('@playwright/test').Page} */ page) =>
	page.evaluate(() => /** @type {VisualViewport} */ (visualViewport).scale);

/** The zoomed-in part of the page: where its corner is and how much of the page it shows. */
const view = (/** @type {import('@playwright/test').Page} */ page) =>
	page.evaluate(() => {
		const { offsetLeft, offsetTop, width, height } = /** @type {VisualViewport} */ (visualViewport);
		return { left: offsetLeft, top: offsetTop, width, height };
	});

/**
 * Two fingers at the height of the element's middle, moved apart or together. They sit as near
 * its middle as lets both stay inside the zoomed view, which is also where touch points and the
 * element's place are measured from.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 * @param {'apart' | 'together'} way
 */
async function pinch(page, locator, way) {
	// A pinch can leave the view gliding, which would move the element from under the fingers.
	let seen = await view(page);
	await expect(async () => {
		const before = seen;
		await page.waitForTimeout(100);
		seen = await view(page);
		expect(seen).toEqual(before);
	}).toPass();
	const box = await boxOf(locator);
	const wide = Math.min(100, seen.width / 2 - 4);
	const x = Math.min(Math.max(box.x + box.width / 2, wide + 4), seen.width - wide - 4);
	const y = box.y + box.height / 2;
	const fingers = (/** @type {number} */ gap) => [
		{ x: x - gap, y, id: 0 },
		{ x: x + gap, y, id: 1 }
	];
	const [from, to] = way === 'apart' ? [wide / 5, wide] : [wide, wide / 5];
	// What matters under each finger is whether it is the play area, which takes no pinch.
	const where = await locator.evaluate(
		(el, points) =>
			points.every(
				([px, py]) =>
					!!document.elementFromPoint(px, py)?.closest('.board-wrap') ===
					!!el.closest('.board-wrap')
			),
		fingers(from).map((finger) => [seen.left + finger.x, seen.top + finger.y])
	);
	expect(where, 'both fingers start on the same side of the play area as the element').toBe(true);
	const session = await page.context().newCDPSession(page);
	await session.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: fingers(from)
	});
	for (let step = 1; step <= 10; step++) {
		await session.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: fingers(from + ((to - from) * step) / 10)
		});
	}
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await session.detach();
}

/**
 * Pinches the element until the page is zoomed in past one and a half times ('apart') or is back
 * at its own size ('together'). How far one pinch goes depends on how quickly the browser keeps
 * up with the fingers, so it can take more than one.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 * @param {'apart' | 'together'} way
 */
async function pinchUntilZoomed(page, locator, way) {
	await expect(async () => {
		await pinch(page, locator, way);
		const scale = await zoom(page);
		if (way === 'apart') expect(scale).toBeGreaterThan(1.5);
		else expect(scale).toBe(1);
	}).toPass();
}

const FINGERS = 'The fingers are sent through the Chromium debugging protocol.';

test('a pinch or a double tap on the board does not zoom it, and a pinch on the header does', async ({
	page,
	browserName
}) => {
	test.skip(browserName !== 'chromium', FINGERS);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);

	await pinch(page, page.locator('.board'), 'apart');
	expect(await zoom(page)).toBe(1);

	// A double tap picks the top ball up and puts it back, at the same size.
	const before = await readBoard(page);
	const tube = page.locator('[data-tube="0"]');
	await tube.evaluate((el) => {
		const picked = /** @type {(string | null)[]} */ ([]);
		new MutationObserver(() => picked.push(el.getAttribute('aria-pressed'))).observe(el, {
			attributeFilter: ['aria-pressed']
		});
		Object.assign(window, { picked });
	});
	const first = await boxOf(tube);
	await page.touchscreen.tap(first.x + first.width / 2, first.y + first.height / 2);
	await page.touchscreen.tap(first.x + first.width / 2, first.y + first.height / 2);
	await expect
		.poll(() => page.evaluate(() => /** @type {any} */ (window).picked))
		.toEqual(['true', 'false']);
	await page.waitForTimeout(500);
	expect(await zoom(page)).toBe(1);
	expect(await readBoard(page)).toEqual(before);

	// The header zooms the page in and out, and the board plays on afterward.
	const header = page.locator('.hud');
	await pinchUntilZoomed(page, header, 'apart');
	await pinchUntilZoomed(page, header, 'together');
	await solveBoard(page);
	await expect(results(page)).toBeVisible();
});

/**
 * One finger put down at a point of the zoomed view, measured from its corner, and dragged up or
 * down. Resolves to whether it started on an element matching the selector.
 * @param {import('@playwright/test').Page} page
 * @param {{ x: number, y: number }} finger
 * @param {number} dy
 * @param {string} selector
 */
async function drag(page, finger, dy, selector) {
	const { left, top } = await view(page);
	const on = await page.evaluate(
		([x, y, target]) => !!document.elementFromPoint(+x, +y)?.closest(String(target)),
		[left + finger.x, top + finger.y, selector]
	);
	const session = await page.context().newCDPSession(page);
	await session.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [{ ...finger, id: 0 }]
	});
	for (let step = 1; step <= 20; step++) {
		await session.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [{ x: finger.x, y: finger.y + (dy * step) / 20, id: 0 }]
		});
	}
	await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await session.detach();
	return on;
}

test('zoomed in, one finger dragged up the board moves the view down the page', async ({
	page,
	browserName
}) => {
	test.skip(browserName !== 'chromium', FINGERS);
	await open(page);
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	await pinchUntilZoomed(page, page.locator('.hud'), 'apart');

	const zoomed = await view(page);
	const finger = { x: zoomed.width / 2, y: zoomed.height - 40 };
	expect(await drag(page, finger, -100, '.board-wrap'), 'the finger starts on the board').toBe(
		true
	);
	await expect.poll(async () => (await view(page)).top).toBeGreaterThan(zoomed.top + 40);
	expect(await zoom(page)).toBeGreaterThan(1.5);
});

test('zoomed in on a dialog, one finger dragged down it moves the view up the page', async ({
	page,
	browserName
}) => {
	test.skip(browserName !== 'chromium', FINGERS);
	await open(page);
	await page.getByRole('button', { name: 'Settings' }).click();
	const title = page.getByRole('dialog').locator('h2');
	// The sheet has finished rising once two readings of its place agree.
	await expect(async () => {
		const before = await boxOf(title);
		await page.waitForTimeout(100);
		expect(await boxOf(title)).toEqual(before);
	}).toPass();
	await pinchUntilZoomed(page, page.getByRole('dialog'), 'apart');

	const zoomed = await view(page);
	expect(zoomed.top, 'the view starts below the top of the page').toBeGreaterThan(40);
	const finger = { x: zoomed.width / 2, y: zoomed.height / 2 };
	expect(await drag(page, finger, 100, '[role="dialog"]'), 'the finger starts on the dialog').toBe(
		true
	);
	await expect.poll(async () => (await view(page)).top).toBeLessThan(zoomed.top - 40);
});
