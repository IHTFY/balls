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

test('delayed events for saves that were replaced since are skipped, the last one applies', () => {
	const first = JSON.stringify({ ...JSON.parse(JSON.stringify(profile)), coins: 10 });
	const second = JSON.stringify({ ...JSON.parse(first), coins: 20 });
	localStorage.setItem(STORAGE_KEY, second);
	notify(first);
	assert.notEqual(profile.coins, 10);
	notify(second);
	assert.equal(profile.coins, 20);
});

test('another copy changing the profile and resetting it before either event arrives', () => {
	persist();
	const base = localStorage.getItem(STORAGE_KEY) ?? '';
	profile.settings.music = !profile.settings.music;
	const changed = JSON.stringify({ ...JSON.parse(base), coins: 200 });
	localStorage.setItem(STORAGE_KEY, changed);
	localStorage.setItem(STORAGE_KEY, base);
	notify(changed);
	notify(base);
	persist();
	assert.equal(saved().settings.music, JSON.parse(base).settings.music);
});

test('a delayed event adopts a newer save made in another copy since, before this copy saves', () => {
	persist();
	const level2 = JSON.stringify({ ...JSON.parse(JSON.stringify(profile)), unlocked: 2 });
	const level3 = JSON.stringify({ ...JSON.parse(level2), unlocked: 3 });
	localStorage.setItem(STORAGE_KEY, level2);
	localStorage.setItem(STORAGE_KEY, level3);
	notify(level2);
	profile.settings.sound = !profile.settings.sound;
	persist();
	assert.equal(saved().unlocked, 3);
	notify(level3);
	assert.equal(profile.unlocked, 3);
});

test('a second event for a save this copy already adopted keeps what changed since', () => {
	persist();
	const base = JSON.parse(JSON.stringify(profile));
	const level2 = JSON.stringify({ ...base, coins: base.coins + 1 });
	const level3 = JSON.stringify({ ...base, coins: base.coins + 2 });
	localStorage.setItem(STORAGE_KEY, level2);
	localStorage.setItem(STORAGE_KEY, level3);
	notify(level2);
	assert.equal(profile.coins, base.coins + 2);
	profile.settings.sound = !base.settings.sound;
	notify(level3);
	assert.equal(profile.settings.sound, !base.settings.sound);
	persist();
	assert.equal(saved().settings.sound, !base.settings.sound);
	assert.equal(saved().coins, base.coins + 2);
});

test('a removed or unreadable save leaves this copy as it is', () => {
	profile.coins = 31;
	persist();
	const previous = localStorage.getItem(STORAGE_KEY);
	localStorage.removeItem(STORAGE_KEY);
	notify(previous);
	notify(null);
	assert.equal(profile.coins, 31);
	localStorage.setItem(STORAGE_KEY, '{not json');
	notify('{not json');
	assert.equal(profile.coins, 31);
});
