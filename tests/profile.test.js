import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	dateKey,
	defaultProfile,
	isNextDay,
	mergeProfiles,
	sanitizeProfile,
	totalStars
} from '../src/lib/game/profile.js';
import { chapterOf, mapChapters, MAX_LEVEL } from '../src/lib/game/levels.js';
import { MAX_SCORE } from '../src/lib/game/scoring.js';
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

test('saved levels stay within the level range and the map still builds', () => {
	const p = sanitizeProfile({ stars: { 2: 3, ['9'.repeat(400)]: 3, [MAX_LEVEL + 1]: 1 } });
	assert.ok(Number.isFinite(p.unlocked) && p.unlocked <= MAX_LEVEL, `unlocked ${p.unlocked}`);
	assert.deepEqual(p.stars, { 2: 3 }, 'stars past the last level are dropped');
	assert.equal(p.unlocked, 3);
	assert.equal(sanitizeProfile({ unlocked: 1e300 }).unlocked, MAX_LEVEL);
	assert.equal(sanitizeProfile({ best: { [MAX_LEVEL + 1]: 5 } }).best[MAX_LEVEL + 1], undefined);
	const last = mapChapters(MAX_LEVEL);
	assert.equal(last.at(-1), chapterOf(MAX_LEVEL), 'the map ends at the last level');
	assert.deepEqual(mapChapters(sanitizeProfile({ unlocked: 1e300 }).unlocked), last);
});

test('the saved score is capped', () => {
	assert.equal(sanitizeProfile({ score: 1e100 }).score, MAX_SCORE);
	assert.equal(sanitizeProfile({ score: 1234 }).score, 1234);
});

test('a profile round-trips through JSON unchanged', () => {
	const p = defaultProfile();
	p.coins = 999;
	p.stars = { 1: 2 };
	p.unlocked = 2;
	assert.deepEqual(sanitizeProfile(JSON.parse(JSON.stringify(p))), p);
});

test('a save from before resets were counted loads with its progress', () => {
	const old = /** @type {Record<string, unknown>} */ ({
		...defaultProfile(),
		coins: 640,
		unlocked: 9
	});
	delete old.resets;
	const p = sanitizeProfile(JSON.parse(JSON.stringify(old)));
	assert.equal(p.resets, 0);
	assert.equal(p.coins, 640);
	assert.equal(p.unlocked, 9);
	assert.equal(sanitizeProfile({ resets: 2 }).resets, 2);
	assert.equal(sanitizeProfile({ resets: 'many' }).resets, 0);
});

/** @param {(p: ReturnType<typeof defaultProfile>) => void} change */
function profileWith(change) {
	const p = sanitizeProfile({
		coins: 500,
		unlocked: 4,
		stars: { 1: 3, 2: 2, 3: 1 },
		best: { 1: 10, 2: 14, 3: 20 },
		score: 9000,
		owned: ['ocean'],
		stats: { solved: 3, moves: 44, seconds: 300, bestCombo: 2, fastest: 50, blitzBest: 700 },
		achievements: { first: '2026-10-01' },
		daily: { done: { '2026-10-01': { moves: 30, stars: 2, seconds: 80 } }, streak: 1, best: 1 },
		saved: { mode: 'level', level: 4, game: { moves: 2, seconds: 10 } }
	});
	change(p);
	return p;
}

test('merging keeps every profile field, and changes nothing when only one copy changed', () => {
	const base = profileWith(() => {});
	const changed = profileWith((p) => {
		p.coins = 20;
		p.unlocked = 6;
		p.stars[4] = 3;
		p.best[1] = 8;
		p.owned.push('neon');
		p.theme = 'ocean';
		p.settings.music = false;
		p.stats.solved = 5;
		p.stats.fastest = 31;
		p.achievements.combo = '2026-10-02';
		p.daily.done['2026-10-02'] = { moves: 12, stars: 3, seconds: 40 };
		p.daily.streak = 2;
		p.daily.last = '2026-10-02';
		p.gift = { last: '2026-10-02', streak: 3 };
		p.tutorialDone = true;
		p.saved = null;
	});
	assert.deepEqual(Object.keys(mergeProfiles(base, base, base)), Object.keys(defaultProfile()));
	assert.equal(JSON.stringify(mergeProfiles(base, base, changed)), JSON.stringify(changed));
	assert.deepEqual(mergeProfiles(base, changed, base), changed);
	// A reset from a version that did not count resets: an unchanged copy takes it whole.
	assert.deepEqual(mergeProfiles(base, base, defaultProfile()), defaultProfile());
	// Such a save never lowers the count of resets this copy holds.
	const counted = profileWith((p) => (p.resets = 2));
	assert.equal(mergeProfiles(counted, counted, base).resets, 2);
});

test('totals changed in two copies at once take both changes', () => {
	const base = profileWith(() => {});
	const mine = profileWith((p) => {
		p.coins += 40;
		p.score += 500;
		p.hints -= 1;
		p.stats.solved += 1;
		p.stats.seconds += 30;
	});
	const theirs = profileWith((p) => {
		p.coins -= 300;
		p.score += 250;
		p.hints += 2;
		p.tubes += 1;
		p.stats.solved += 2;
		p.stats.seconds += 12;
	});
	const merged = mergeProfiles(base, mine, theirs);
	assert.equal(merged.coins, 240);
	assert.equal(merged.score, 9750);
	assert.equal(merged.hints, base.hints + 1);
	assert.equal(merged.tubes, base.tubes + 1);
	assert.equal(merged.stats.solved, 6);
	assert.equal(merged.stats.seconds, 342);
	const spent = profileWith((p) => (p.coins -= 400));
	assert.equal(mergeProfiles(base, spent, spent).coins, 0, 'coins never go below zero');
	const rich = profileWith((p) => (p.score = MAX_SCORE - 10));
	assert.equal(mergeProfiles(base, rich, theirs).score, MAX_SCORE);
	// The top score in another copy is exact after a merge with nothing changed here.
	const top = profileWith((p) => (p.score = MAX_SCORE));
	const near = profileWith((p) => (p.score = MAX_SCORE - 1));
	assert.equal(mergeProfiles(near, near, top).score, MAX_SCORE);
});

test('records changed in two copies at once keep the better one', () => {
	const base = profileWith(() => {});
	const mine = profileWith((p) => {
		p.unlocked = 5;
		p.stars[3] = 2;
		p.stars[4] = 1;
		p.best[3] = 18;
		p.best[4] = 30;
		p.stats.bestCombo = 5;
		p.stats.fastest = 45;
		p.stats.blitzBest = 600;
		p.daily.best = 3;
	});
	const theirs = profileWith((p) => {
		p.unlocked = 8;
		p.stars[3] = 3;
		p.stars[7] = 2;
		p.best[3] = 16;
		p.stats.bestCombo = 4;
		p.stats.fastest = 48;
		p.stats.blitzBest = 900;
		p.daily.best = 2;
	});
	const merged = mergeProfiles(base, mine, theirs);
	assert.equal(merged.unlocked, 8);
	assert.deepEqual(merged.stars, { 1: 3, 2: 2, 3: 3, 4: 1, 7: 2 });
	assert.deepEqual(merged.best, { 1: 10, 2: 14, 3: 16, 4: 30 });
	assert.equal(merged.stats.bestCombo, 5);
	assert.equal(merged.stats.fastest, 45);
	assert.equal(merged.stats.blitzBest, 900);
	assert.equal(merged.daily.best, 3);
	const first = profileWith((p) => (p.stats.fastest = 0));
	assert.equal(
		mergeProfiles(
			first,
			profileWith(() => {}),
			first
		).stats.fastest,
		50,
		'a first record is kept'
	);
});

test('other values changed in two copies at once stay as this copy has them', () => {
	const base = profileWith(() => {});
	const mine = profileWith((p) => {
		p.settings.sound = false;
		p.owned.push('sunset');
		p.theme = 'sunset';
		p.achievements.combo = '2026-10-02';
		p.saved = { mode: 'daily', date: '2026-10-02', game: { moves: 1, seconds: 3 } };
	});
	const theirs = profileWith((p) => {
		p.settings.sound = true;
		p.settings.music = false;
		p.owned.push('gem');
		p.theme = 'ocean';
		p.skin = 'gem';
		p.achievements.rich = '2026-10-03';
		p.saved = { mode: 'level', level: 4, game: { moves: 9, seconds: 60 } };
	});
	const merged = mergeProfiles(base, mine, theirs);
	assert.equal(merged.settings.sound, false);
	assert.equal(merged.settings.music, false);
	assert.deepEqual(merged.owned, ['midnight', 'glossy', 'ocean', 'gem', 'sunset']);
	assert.equal(merged.theme, 'sunset');
	assert.equal(merged.skin, 'gem');
	assert.deepEqual(Object.keys(merged.achievements), ['first', 'rich', 'combo']);
	assert.deepEqual(merged.saved, mine.saved);
	assert.deepEqual(sanitizeProfile(JSON.parse(JSON.stringify(merged))), merged);
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
	assert.ok(
		validSnapshot({
			...good,
			tubes: [[ball(0, 0), ball(3, 0)], [ball(2, 1)], [ball(1, 1)]],
			history: [...good.history, { from: 1, to: 0, count: 1 }],
			moves: 2
		}),
		'a longer game'
	);
	assert.ok(
		!validSnapshot({ ...good, moves: 0 }),
		'the move count does not match the history, so undo would go below zero'
	);
	assert.ok(
		!validSnapshot({ ...good, moves: 2, history: [...good.history, { from: 0, to: 2, count: 1 }] }),
		'history moves a ball that is not where it says'
	);
	assert.ok(
		!validSnapshot({ ...good, history: [{ from: 1, to: 2, count: 1 }] }),
		'history does not lead to this board'
	);
});
