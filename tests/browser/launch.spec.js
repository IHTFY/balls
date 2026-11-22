import { expect, test } from '@playwright/test';
import { open } from './helpers.js';

// Playwright can't open a page as an installed app, so the launch script's display-mode query
// answers yes. Timers and animations also run tenfold slower, so a tap surely lands during the exit
// even on a loaded machine.
const installedAndSlow = () => {
	const matchMedia = window.matchMedia.bind(window);
	window.matchMedia = (query) =>
		query.includes('display-mode')
			? /** @type {MediaQueryList} */ ({ matches: true, media: query })
			: matchMedia(query);
	const setTimeout = window.setTimeout;
	window.setTimeout = /** @type {typeof window.setTimeout} */ (
		(
			/** @type {TimerHandler} */ callback,
			/** @type {number} */ delay = 0,
			/** @type {unknown[]} */ ...args
		) => setTimeout(callback, delay * 10, ...args)
	);
	const animate = Element.prototype.animate;
	/** @type {typeof animate} */
	Element.prototype.animate = function (keyframes, options) {
		const animation = animate.call(this, keyframes, options);
		animation.playbackRate = 0.1;
		return animation;
	};
};

test('a touch during the installed launch only skips it', async ({ browser }) => {
	const context = await browser.newContext({
		hasTouch: true,
		isMobile: true,
		viewport: { width: 390, height: 844 }
	});
	const page = await context.newPage();
	await page.addInitScript(installedAndSlow);
	await open(page);
	await page.waitForFunction(
		() => document.getElementById('launch')?.getAnimations({ subtree: true }).length
	);
	const settings = page.getByRole('button', { name: 'Settings' });
	const box = /** @type {NonNullable<Awaited<ReturnType<typeof settings.boundingBox>>>} */ (
		await settings.boundingBox()
	);
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	// The copy covers the button, so a tap that reaches it can only be the click after the touch.
	expect(
		await page.evaluate(
			([x, y]) => document.elementFromPoint(x, y)?.closest('#launch') !== null,
			[x, y]
		)
	).toBe(true);
	await page.touchscreen.tap(x, y);
	await expect(page.locator('#launch')).toHaveCount(0, { timeout: 5000 });
	await page.waitForTimeout(300);
	await expect(page.getByRole('dialog')).toHaveCount(0);

	// The next tap is a real one and opens Settings.
	await page.touchscreen.tap(x, y);
	await expect(page.getByRole('dialog')).toBeVisible();
	await context.close();
});

for (const next of ['click', 'Enter']) {
	test(`a mouse press held past the launch leaves the next ${next} alone`, async ({ page }) => {
		await page.addInitScript(installedAndSlow);
		await open(page);
		await page.waitForFunction(
			() => document.getElementById('launch')?.getAnimations({ subtree: true }).length
		);
		const settings = page.getByRole('button', { name: 'Settings' });
		const box = /** @type {NonNullable<Awaited<ReturnType<typeof settings.boundingBox>>>} */ (
			await settings.boundingBox()
		);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await expect(page.locator('#launch')).toHaveCount(0, { timeout: 5000 });
		// The press began on the copy, which is gone now, so no click follows the release.
		await page.mouse.up();
		await expect(page.getByRole('dialog')).toHaveCount(0);

		if (next === 'click') await settings.click();
		else {
			await settings.focus();
			await page.keyboard.press('Enter');
		}
		await expect(page.getByRole('dialog')).toBeVisible();
	});
}
