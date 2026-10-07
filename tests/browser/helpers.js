import { expect } from '@playwright/test';
import { solve } from '../../src/lib/game/solver.js';

/**
 * Starts the app with a stored profile (merged over a returning-player default).
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, unknown>} [profile]
 */
export async function open(page, profile = {}) {
	await page.addInitScript((stored) => {
		if (sessionStorage.getItem('seeded')) return;
		sessionStorage.setItem('seeded', '1');
		const today = new Date();
		const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		localStorage.setItem(
			'balls.profile.v1',
			JSON.stringify({
				tutorialDone: true,
				gift: { last: key, streak: 1 },
				settings: { music: false },
				...stored
			})
		);
	}, profile);
	await page.goto('/');
}

/** @param {import('@playwright/test').Page} page */
export async function waitForBoard(page) {
	await expect(page.locator('[data-tube]').first()).toBeVisible();
	// Let the drop-in animation finish so clicks land on settled tubes.
	await page.waitForTimeout(900);
}

/**
 * Reads the board's colors from the DOM: tubes of colors, bottom to top.
 * @param {import('@playwright/test').Page} page
 */
export async function readBoard(page) {
	return page.evaluate(() => {
		const tubes = [...document.querySelectorAll('[data-tube]')].map(
			() => /** @type {number[]} */ ([])
		);
		for (const el of document.querySelectorAll('.ball-slot')) {
			const tube = Number(/** @type {HTMLElement} */ (el).dataset.in);
			const slot = Number(/** @type {HTMLElement} */ (el).dataset.slot);
			tubes[tube][slot] = Number(
				/** @type {HTMLElement} */ (el.querySelector('[data-color]'))?.dataset.color
			);
		}
		const capacity = Number(
			/** @type {HTMLElement} */ (document.querySelector('[data-capacity]')).dataset.capacity
		);
		return { tubes, capacity };
	});
}

/**
 * Taps one tube.
 * @param {import('@playwright/test').Page} page
 * @param {number} i
 */
export const tap = (page, i) => page.locator(`[data-tube="${i}"]`).click();

/**
 * Solves the current puzzle by tapping through a solver's moves.
 * @param {import('@playwright/test').Page} page
 */
export async function solveBoard(page) {
	const { tubes, capacity } = await readBoard(page);
	const result = solve(tubes, capacity);
	expect(result.status).toBe('solved');
	for (const [from, to] of result.moves ?? []) {
		await tap(page, from);
		await tap(page, to);
	}
	return result.moves?.length ?? 0;
}
