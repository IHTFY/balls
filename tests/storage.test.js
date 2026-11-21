import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';
import { defaultProfile, STORAGE_KEY } from '../src/lib/game/profile.js';

const { profile, persist, resetProfile } = await import('../src/lib/state/profile.svelte.js');

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

test('another copy saving a change and then undoing it leaves an unsaved change here alone', () => {
	persist();
	const base = localStorage.getItem(STORAGE_KEY) ?? '';
	profile.settings.music = !profile.settings.music;
	const changed = JSON.stringify({ ...JSON.parse(base), coins: 200 });
	localStorage.setItem(STORAGE_KEY, changed);
	localStorage.setItem(STORAGE_KEY, base);
	notify(changed);
	notify(base);
	persist();
	assert.equal(saved().settings.music, !JSON.parse(base).settings.music);
	assert.equal(saved().coins, JSON.parse(base).coins);
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
	localStorage.setItem(STORAGE_KEY, '');
	notify('');
	assert.equal(profile.coins, 31);
});

test('a level finished here survives a save from another copy that arrives before autosave', () => {
	persist();
	const base = JSON.parse(JSON.stringify(profile));
	const next = base.unlocked + 1;
	profile.stars[base.unlocked] = 3;
	profile.unlocked = next;
	profile.coins += 12;
	const other = JSON.stringify({
		...base,
		settings: { ...base.settings, music: !base.settings.music }
	});
	localStorage.setItem(STORAGE_KEY, other);
	notify(other);
	assert.equal(profile.unlocked, next, 'the win is still in memory');
	assert.equal(profile.settings.music, !base.settings.music, "the other copy's setting applies");
	persist();
	assert.equal(saved().stars[base.unlocked], 3);
	assert.equal(saved().unlocked, next);
	assert.equal(saved().coins, base.coins + 12);
	assert.equal(saved().settings.music, !base.settings.music);
});

test('a save builds on what another copy saved even before its event arrives', () => {
	persist();
	const base = JSON.parse(JSON.stringify(profile));
	profile.coins += 5;
	profile.stats.moves += 7;
	const other = JSON.stringify({
		...base,
		coins: base.coins + 30,
		stats: { ...base.stats, moves: base.stats.moves + 2 },
		settings: { ...base.settings, haptics: !base.settings.haptics }
	});
	localStorage.setItem(STORAGE_KEY, other);
	persist();
	assert.equal(saved().coins, base.coins + 35, 'coins earned in both copies add up');
	assert.equal(saved().stats.moves, base.stats.moves + 9);
	assert.equal(saved().settings.haptics, !base.settings.haptics);
	notify(other);
	assert.equal(profile.coins, base.coins + 35, 'the late event changes nothing');
});

test('saves A, B, then A again from another copy keep a change made here after the first event', () => {
	persist();
	const base = JSON.parse(JSON.stringify(profile));
	const a = JSON.stringify({
		...base,
		settings: { ...base.settings, music: !base.settings.music }
	});
	const b = JSON.stringify(base);
	localStorage.setItem(STORAGE_KEY, a);
	localStorage.setItem(STORAGE_KEY, b);
	localStorage.setItem(STORAGE_KEY, a);
	notify(a);
	profile.settings.sound = !base.settings.sound;
	profile.coins += 9;
	notify(b);
	notify(a);
	assert.equal(profile.settings.sound, !base.settings.sound);
	persist();
	assert.equal(saved().settings.sound, !base.settings.sound);
	assert.equal(saved().coins, base.coins + 9);
	assert.equal(saved().settings.music, !base.settings.music);
});

test("taking another copy's save does not write it back", () => {
	persist();
	const base = JSON.parse(JSON.stringify(profile));
	const other = JSON.stringify({
		...base,
		coins: base.coins + 1,
		owned: [...base.owned, 'ocean'],
		achievements: { ...base.achievements, first: '2026-10-01' }
	});
	localStorage.setItem(STORAGE_KEY, other);
	notify(other);
	/** @type {string[]} */
	const writes = [];
	const setItem = localStorage.setItem;
	localStorage.setItem = (key, value) => (writes.push(key), setItem(key, value));
	persist();
	localStorage.setItem = setItem;
	assert.deepEqual(writes, []);
	assert.equal(localStorage.getItem(STORAGE_KEY), other);
});

test('a reset here counts past a reset in another copy that this copy has not seen yet', () => {
	persist();
	const theirs = profile.resets + 1;
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultProfile(), resets: theirs }));
	resetProfile();
	assert.equal(profile.resets, theirs + 1);
	assert.equal(saved().resets, theirs + 1);
});
