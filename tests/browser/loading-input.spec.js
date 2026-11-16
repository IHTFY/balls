import assert from 'node:assert/strict';
import { expect, test } from '@playwright/test';
import { open, readBoard, tap, waitForBoard } from './helpers.js';
import { solve } from '../../src/lib/game/solver.js';

test('keyboard input cannot finish the previous board while a daily is loading', async ({
	page
}) => {
	await page.route('**/*', (route) =>
		new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
	);
	await page.addInitScript(() => {
		const send = Worker.prototype.postMessage;
		Worker.prototype.postMessage = function (
			/** @type {{ task?: import('../../src/lib/puzzles.js').Task }} */ message,
			/** @type {StructuredSerializeOptions | Transferable[]} */ options = {}
		) {
			if (sessionStorage.getItem('delayGenerate') && message.task?.type === 'generate') {
				setTimeout(() => Reflect.apply(send, this, [message, options]), 5000);
			} else Reflect.apply(send, this, [message, options]);
		};
	});
	await open(page, { settings: { music: false, reducedMotion: true, deadEnd: false } });
	await page.getByRole('button', { name: /Play.*Level 1/ }).click();
	await waitForBoard(page);
	const { tubes, capacity } = await readBoard(page);
	const solution = solve(tubes, capacity);
	expect(solution.status).toBe('solved');
	assert.ok(solution.moves);
	for (const [from, to] of solution.moves.slice(0, -1)) {
		await tap(page, from);
		await tap(page, to);
	}
	const lastMove = solution.moves.at(-1);
	assert.ok(lastMove);
	const [from, to] = lastMove;
	await page.getByRole('button', { name: 'Home', exact: true }).click();
	await page.evaluate(() => {
		sessionStorage.setItem('delayGenerate', '1');
	});
	await page.getByRole('button', { name: /Daily/ }).click();
	await expect(page.locator('[data-state="loading"]')).toBeVisible();
	await page.keyboard.press(String(from + 1));
	await page.keyboard.press(String(to + 1));
	await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
	const snapshot = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('balls.profile.v1') ?? '{}')
	);
	await expect(page.locator('[data-state="loading"]')).toBeVisible();
	expect(
		snapshot.stats.dailySolved,
		'an unplayed daily must not get credit for the old level board'
	).toBe(0);
	expect(snapshot.daily.done).toEqual({});
	expect(snapshot.score).toBe(0);
	for (const name of ['Undo', 'Restart', /Hint/, /Add tube/]) {
		await expect(page.getByRole('button', { name })).toBeDisabled();
	}
});
