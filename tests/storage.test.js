import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';
import { defaultProfile, STORAGE_KEY } from '../src/lib/game/profile.js';

const { profile, persist } = await import('../src/lib/state/profile.svelte.js');

/** @param {string | null} newValue */
function notify(newValue) {
	window.dispatchEvent(
		Object.assign(new Event('storage'), { key: STORAGE_KEY, newValue, storageArea: localStorage })
	);
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

test('a delayed storage event does not roll back what this copy saved since', () => {
	persist();
	const older = localStorage.getItem(STORAGE_KEY);
	profile.stars[1] = 3;
	profile.unlocked = 2;
	persist();
	notify(older);
	profile.settings.music = false;
	persist();
	assert.equal(saved().unlocked, 2);
	assert.equal(saved().stars[1], 3);
	assert.equal(profile.unlocked, 2);
});

test('an idle copy takes the profile another copy saved', () => {
	const other = { ...JSON.parse(JSON.stringify(profile)), coins: 777, unlocked: 5 };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(other));
	notify(JSON.stringify(other));
	assert.equal(profile.coins, 777);
	assert.equal(profile.unlocked, 5);
	profile.settings.sound = false;
	persist();
	assert.equal(saved().coins, 777, 'the next write builds on the adopted profile');
});

test('an idle copy takes a profile reset made in another copy', () => {
	const fresh = JSON.stringify(defaultProfile());
	localStorage.setItem(STORAGE_KEY, fresh);
	notify(fresh);
	assert.deepEqual(JSON.parse(JSON.stringify(profile)), defaultProfile());
	persist();
	assert.equal(saved().unlocked, 1);
});

test('a delayed event after another copy saved a newer profile adopts the newer one', () => {
	const first = { ...JSON.parse(JSON.stringify(profile)), coins: 10 };
	const second = { ...first, coins: 20 };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(second));
	notify(JSON.stringify(first));
	assert.equal(profile.coins, 20);
});

test('a removed or unreadable save leaves this copy as it is', () => {
	profile.coins = 31;
	persist();
	notify(null);
	localStorage.setItem(STORAGE_KEY, '{not json');
	notify('{not json');
	assert.equal(profile.coins, 31);
});
