import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';
import { defaultProfile, STORAGE_KEY } from '../src/lib/game/profile.js';
import { solve } from '../src/lib/game/solver.js';

let reloads = 0;
Object.defineProperty(globalThis, 'location', {
	value: { reload: () => reloads++ },
	configurable: true
});

const { game, startLevel, finish } = await import('../src/lib/state/session.svelte.js');
const { profile, persist } = await import('../src/lib/state/profile.svelte.js');

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

test('a board opened before a reset in another copy cannot bring progress back', async () => {
	profile.stars[1] = 3;
	profile.unlocked = 2;
	persist();
	startLevel(2);
	await new Promise((resolve) => setImmediate(resolve));
	profile.settings.music = !profile.settings.music;

	const reset = JSON.stringify({ ...defaultProfile(), resets: profile.resets + 1 });
	localStorage.setItem(STORAGE_KEY, reset);
	window.dispatchEvent(
		Object.assign(new Event('storage'), {
			key: STORAGE_KEY,
			newValue: reset,
			storageArea: localStorage
		})
	);
	assert.equal(reloads, 1, 'this copy reloads to start from the reset profile');

	// Until the reload lands the old board is still on screen: finishing it must not be saved.
	const solution = solve(game.colorTubes, game.capacity);
	assert.equal(solution.status, 'solved');
	for (const [from, to] of solution.moves) {
		game.tap(from);
		game.tap(to);
	}
	finish();
	persist();
	assert.equal(localStorage.getItem(STORAGE_KEY), reset);
	assert.equal(saved().unlocked, 1);
	assert.deepEqual(saved().stars, {});
});
