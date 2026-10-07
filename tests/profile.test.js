import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	dateKey,
	defaultProfile,
	isNextDay,
	sanitizeProfile,
	totalStars
} from '../src/lib/game/profile.js';
import { validSnapshot } from '../src/lib/game/snapshot.js';

test('missing or malformed saves fall back to defaults', () => {
	for (const raw of [null, undefined, 42, 'text', [], {}]) {
		assert.deepEqual(sanitizeProfile(raw), defaultProfile());
	}
});

test('valid values survive and invalid ones are replaced', () => {
	const p = sanitizeProfile({
		coins: 250,
		hints: -4,
		unlocked: 'seven',
		stars: { 1: 3, 2: 2, 3: 9, abc: 1, 0: 2 },
		best: { 1: 12, 2: 0 },
		owned: ['midnight', 'ocean', 'not-a-theme', 'neon'],
		theme: 'ocean',
		skin: 'gem',
		settings: { sound: false, music: 'yes', unknown: true },
		stats: { solved: 5, moves: NaN },
		achievements: { first: '2026-10-01', bad: 3 },
		daily: { done: { '2026-10-01': { moves: 30, stars: 2 }, nope: {} }, streak: 2, last: 'x' }
	});
	assert.equal(p.coins, 250);
	assert.equal(p.hints, 3);
	assert.deepEqual(p.stars, { 1: 3, 2: 2 });
	assert.equal(p.unlocked, 3, 'unlocked covers every cleared level');
	assert.deepEqual(p.best, { 1: 12 });
	assert.deepEqual(p.owned, ['midnight', 'glossy', 'ocean', 'neon']);
	assert.equal(p.theme, 'ocean');
	assert.equal(p.skin, 'glossy', 'unowned skins are not equipped');
	assert.equal(p.settings.sound, false);
	assert.equal(p.settings.music, true);
	assert.ok(!('unknown' in p.settings));
	assert.equal(p.stats.solved, 5);
	assert.equal(p.stats.moves, 0);
	assert.deepEqual(p.achievements, { first: '2026-10-01' });
	assert.deepEqual(Object.keys(p.daily.done), ['2026-10-01']);
	assert.equal(p.daily.streak, 2);
	assert.equal(p.daily.last, null);
	assert.equal(totalStars(p), 5);
});

test('a profile round-trips through JSON unchanged', () => {
	const p = defaultProfile();
	p.coins = 999;
	p.stars = { 1: 2 };
	p.unlocked = 2;
	assert.deepEqual(sanitizeProfile(JSON.parse(JSON.stringify(p))), p);
});

test('dates use the local calendar', () => {
	assert.equal(dateKey(new Date(2026, 0, 5)), '2026-01-05');
	assert.ok(isNextDay('2026-12-31', '2027-01-01'));
	assert.ok(isNextDay('2026-03-08', '2026-03-09'));
	assert.ok(!isNextDay('2026-03-08', '2026-03-10'));
});

test('saved games are only resumed when they are legal positions', () => {
	const ball = (/** @type {number} */ id, /** @type {number} */ color) => ({
		id,
		color,
		hidden: false
	});
	const start = [[ball(0, 0), ball(1, 1)], [ball(2, 1), ball(3, 0)], []];
	const good = {
		start,
		tubes: [[ball(0, 0)], [ball(2, 1), ball(3, 0)], [ball(1, 1)]],
		history: [{ from: 0, to: 2, count: 1 }],
		capacity: 2,
		par: 4,
		moves: 1,
		seconds: 5,
		undos: 0,
		hintsUsed: 0,
		tubesAdded: 0,
		bestCombo: 0
	};
	assert.ok(validSnapshot(good));
	assert.ok(validSnapshot({ ...good, tubes: [...good.tubes, []], tubesAdded: 1 }));
	assert.ok(!validSnapshot(null));
	assert.ok(!validSnapshot({ ...good, moves: -1 }), 'negative counts');
	assert.ok(!validSnapshot({ ...good, tubes: good.tubes.slice(0, 2) }), 'a missing tube');
	assert.ok(
		!validSnapshot({ ...good, tubes: [[ball(0, 0), ball(1, 1), ball(2, 1)], [ball(3, 0)], []] }),
		'an overfull tube'
	);
	assert.ok(
		!validSnapshot({ ...good, tubes: [[ball(0, 1)], [ball(2, 1), ball(3, 0)], [ball(1, 1)]] }),
		'a ball changed color'
	);
	assert.ok(
		!validSnapshot({ ...good, history: [{ from: 0, to: 9, count: 1 }] }),
		'history names a missing tube'
	);
	assert.ok(
		!validSnapshot({ ...good, tubes: [[{ id: 0, color: 0 }], good.tubes[1], good.tubes[2]] }),
		'a malformed ball'
	);
});
