import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACHIEVEMENTS, newlyEarned } from '../src/lib/game/achievements.js';
import { generatePuzzle } from '../src/lib/game/generator.js';
import { dailySeed, dailySpec, levelSeed, levelSpec, MAX_COLORS } from '../src/lib/game/levels.js';
import { canMove, isSolved, usefulMoves } from '../src/lib/game/rules.js';
import { dailyCoins, levelCoins, rankFor, scoreFor, starsFor } from '../src/lib/game/scoring.js';
import { solve } from '../src/lib/game/solver.js';
import { PALETTE, SKINS, SYMBOLS } from '../src/lib/game/cosmetics.js';
import { defaultProfile } from '../src/lib/game/profile.js';
import { createRng, shuffleInPlace } from '../src/lib/game/rng.js';

/**
 * Plays single-ball moves, failing on any illegal one.
 * @param {number[][]} tubes
 * @param {number} capacity
 * @param {[number, number][]} moves
 */
function replay(tubes, capacity, moves) {
	const board = tubes.map((t) => [...t]);
	for (const [from, to] of moves) {
		assert.ok(canMove(board, from, to, capacity), `illegal move ${from}→${to}`);
		board[to].push(/** @type {number} */ (board[from].pop()));
	}
	return board;
}

test('moves follow the color and capacity rules', () => {
	const tubes = [[0, 1], [1], [0, 0, 0, 1], []];
	assert.ok(canMove(tubes, 0, 1, 4), 'onto the same color');
	assert.ok(canMove(tubes, 0, 3, 4), 'into an empty tube');
	assert.ok(!canMove(tubes, 1, 2, 4), 'onto a full tube');
	assert.ok(!canMove(tubes, 3, 0, 4), 'from an empty tube');
	assert.ok(!canMove(tubes, 0, 0, 4), 'onto itself');
	assert.ok(!canMove([[0], [1]], 0, 1, 4), 'onto a different color');
});

test('a one-color tube is never moved into an empty tube', () => {
	assert.deepEqual(usefulMoves([[0, 0], [1, 0], []], 4), [
		[0, 1],
		[1, 0],
		[1, 2]
	]);
});

test('solver solutions replay legally to a solved board', () => {
	for (let level = 1; level <= 40; level++) {
		const { tubes, capacity } = generatePuzzle(levelSpec(level), levelSeed(level));
		const result = solve(tubes, capacity);
		assert.equal(result.status, 'solved', `level ${level}`);
		assert.ok(isSolved(replay(tubes, capacity, result.moves), capacity), `level ${level}`);
	}
});

test('solver proves small dead ends unsolvable', () => {
	// No empty tube and no matching tops: nothing can ever move.
	assert.equal(
		solve(
			[
				[0, 1],
				[1, 0]
			],
			2
		).status,
		'unsolvable'
	);
	// One spare slot is not enough to untangle these.
	assert.equal(
		solve(
			[
				[0, 1, 0],
				[1, 0, 1],
				[2, 2]
			],
			3
		).status,
		'unsolvable'
	);
	assert.equal(
		solve(
			[
				[0, 0],
				[1, 1]
			],
			2
		).status,
		'solved'
	);
});

test('a merges-only search never drops a ball into an empty tube', () => {
	// Sorting these two needs the spare tube, so only a full search can.
	const swapped = [[0, 1], [1, 0], []];
	assert.equal(solve(swapped, 2).status, 'solved');
	assert.equal(solve(swapped, 2, { merges: true }).status, 'unsolvable');

	const tubes = [[0], [1, 1], [0, 0, 0], [], [1, 1]];
	const result = solve(tubes, 4, { merges: true, weight: 1 });
	assert.equal(result.status, 'solved');
	assert.ok(result.moves?.every(([, to]) => to !== 3));
});

test('solver reports unknown when the budget runs out', () => {
	const { tubes, capacity } = generatePuzzle(levelSpec(40), levelSeed(40));
	assert.equal(solve(tubes, capacity, { maxNodes: 1, weight: 1 }).status, 'unknown');
});

test('generated levels are deterministic, unsolved, and match their spec', () => {
	for (const level of [1, 2, 5, 18, 31, 50, 60, 77]) {
		const spec = levelSpec(level);
		const a = generatePuzzle(spec, levelSeed(level));
		const b = generatePuzzle(spec, levelSeed(level));
		assert.deepEqual(a, b, `level ${level} differs between runs`);
		assert.equal(a.tubes.length, spec.colors + spec.empty);
		assert.ok(!isSolved(a.tubes, a.capacity));
		assert.ok(a.par > 0);
		for (let c = 0; c < spec.colors; c++) {
			const n = a.tubes.flat().filter((x) => x === c).length;
			assert.equal(n, spec.capacity, `level ${level} color ${c}`);
		}
	}
});

test('par is never longer than a solution the solver can find', () => {
	for (const level of [3, 9, 14, 22]) {
		const p = generatePuzzle(levelSpec(level), levelSeed(level));
		const optimal = solve(p.tubes, p.capacity, { weight: 1, maxNodes: 200_000 });
		assert.equal(optimal.status, 'solved');
		assert.ok(p.par <= optimal.moves.length + 2, `level ${level}: par ${p.par}`);
	}
});

test('the level curve stays within the palette and keeps growing', () => {
	let previous = 0;
	for (let level = 1; level <= 300; level++) {
		const spec = levelSpec(level);
		assert.ok(spec.colors >= 2 && spec.colors <= MAX_COLORS, `level ${level}`);
		assert.ok(spec.capacity >= 3 && spec.capacity <= 5);
		assert.ok(spec.empty >= 1);
		if (level <= 40 && !spec.boss && spec.capacity === 4) {
			assert.ok(spec.colors >= previous - 0, `level ${level} got easier`);
			previous = spec.colors;
		}
	}
	assert.ok(levelSpec(10).boss && !levelSpec(11).boss);
	assert.ok(MAX_COLORS <= PALETTE.length && MAX_COLORS <= SYMBOLS.length);
	for (const skin of SKINS) {
		assert.ok(skin.colors.length >= MAX_COLORS, skin.id);
		if (skin.emoji) assert.ok(skin.emoji.length >= MAX_COLORS, skin.id);
	}
});

test('daily puzzles depend only on the date', () => {
	const a = generatePuzzle(dailySpec('2026-10-07'), dailySeed('2026-10-07'));
	const b = generatePuzzle(dailySpec('2026-10-07'), dailySeed('2026-10-07'));
	const c = generatePuzzle(dailySpec('2026-10-08'), dailySeed('2026-10-08'));
	assert.deepEqual(a, b);
	assert.notDeepEqual(a.tubes, c.tubes);
});

test('stars reward finishing near par', () => {
	assert.equal(starsFor(20, 20), 3);
	assert.equal(starsFor(24, 20), 3);
	assert.equal(starsFor(25, 20), 2);
	assert.equal(starsFor(32, 20), 2);
	assert.equal(starsFor(33, 20), 1);
	assert.equal(starsFor(15, 20), 3);
	assert.equal(starsFor(5, 3), 3, 'small boards allow two extra moves');
});

test('scores add up and bosses double', () => {
	const base = {
		colors: 5,
		capacity: 4,
		moves: 20,
		par: 20,
		seconds: 200,
		bestCombo: 1,
		undos: 1,
		hints: 0
	};
	const plain = scoreFor(base);
	assert.equal(
		plain.total,
		plain.lines.reduce((s, l) => s + l.points, 0)
	);
	const boss = scoreFor({ ...base, boss: true });
	assert.equal(boss.total, plain.total * 2);
	assert.ok(scoreFor({ ...base, moves: 18 }).total > plain.total, 'beating par pays more');
	assert.ok(scoreFor({ ...base, moves: 30 }).total < plain.total, 'extra moves pay less');
});

test('coins pay fully once, then only for new stars', () => {
	assert.equal(levelCoins(3, 0, false), 25);
	assert.equal(levelCoins(3, 0, true), 50);
	assert.equal(levelCoins(3, 3, false), 2);
	assert.equal(levelCoins(3, 1, false), 12);
});

test('ranks rise with score', () => {
	assert.equal(rankFor(0).level, 1);
	assert.ok(rankFor(1_000_000).level > rankFor(10_000).level);
	const r = rankFor(2000);
	assert.ok(r.progress >= 0 && r.progress < 1 && r.toNext > 0);
});

test('achievement ids are unique and each can be earned', () => {
	const ids = ACHIEVEMENTS.map((a) => a.id);
	assert.equal(new Set(ids).size, ids.length);
	const p = defaultProfile();
	assert.deepEqual(newlyEarned(p), []);
	p.stats.solved = 1;
	assert.deepEqual(
		newlyEarned(p).map((a) => a.id),
		['first']
	);
});

test('a steady player unlocks trophies a few at a time, not in bursts', () => {
	// Plays levels 1–60 near par, a daily challenge and gift every eight levels,
	// and counts how many trophies arrive with each level.
	const p = defaultProfile();
	const earn = (/** @type {number} */ n) => {
		p.coins += n;
		p.stats.coinsEarned += n;
	};
	let most = 0;
	for (let level = 1; level <= 60; level++) {
		const spec = levelSpec(level);
		const par = Math.round(spec.colors * spec.capacity * 0.9);
		const sloppy = level % 5 === 2;
		const moves = sloppy ? Math.ceil(par * 1.4) : par + 1;
		const seconds = spec.colors * spec.capacity * 3;
		const bestCombo = spec.colors >= 4 ? 2 : 1;
		const stars = starsFor(moves, par);
		const s = p.stats;
		s.solved++;
		s.moves += moves;
		s.bestCombo = Math.max(s.bestCombo, bestCombo);
		if (!sloppy) s.flawless++;
		if (spec.mystery) s.mysterySolved++;
		if (stars === 3) s.perfect++;
		if (spec.boss) s.bossesBeaten++;
		s.tubesCompleted += spec.colors;
		s.seconds += seconds;
		p.score += scoreFor({
			...spec,
			moves,
			par,
			seconds,
			bestCombo,
			undos: sloppy ? 2 : 0,
			hints: 0
		}).total;
		earn(levelCoins(stars, 0, spec.boss));
		p.stars[level] = stars;
		p.unlocked = level + 1;
		if (level % 8 === 1) {
			const day = (level - 1) / 8 + 1;
			p.daily.streak = p.daily.best = day;
			s.dailySolved++;
			earn(dailyCoins(day) + 50);
		}
		let count = 0;
		for (let found = newlyEarned(p); found.length; found = newlyEarned(p))
			for (const a of found) {
				p.achievements[a.id] = 'today';
				earn(a.reward);
				count++;
			}
		most = Math.max(most, count);
	}
	assert.ok(most <= 2, `${most} trophies arrived with one level`);
	assert.ok(Object.keys(p.achievements).length >= 15, 'trophies keep coming through level 60');
});

test('solver agrees with exhaustive search on small boards', () => {
	/** Breadth-first search over every legal single-ball move, no pruning. */
	const solvable = (/** @type {number[][]} */ start, /** @type {number} */ capacity) => {
		const seen = new Set([JSON.stringify(start)]);
		const queue = [start];
		while (queue.length) {
			const board = /** @type {number[][]} */ (queue.shift());
			if (isSolved(board, capacity)) return true;
			for (let from = 0; from < board.length; from++)
				for (let to = 0; to < board.length; to++) {
					if (!canMove(board, from, to, capacity)) continue;
					const next = board.map((t) => [...t]);
					next[to].push(/** @type {number} */ (next[from].pop()));
					const key = JSON.stringify(next);
					if (!seen.has(key)) {
						seen.add(key);
						queue.push(next);
					}
				}
		}
		return false;
	};
	const rng = createRng(7);
	let unsolvable = 0;
	for (let i = 0; i < 300; i++) {
		const colors = 2 + Math.floor(rng() * 2);
		const capacity = 2 + Math.floor(rng() * 2);
		const balls = shuffleInPlace(
			Array.from({ length: colors * capacity }, (_, k) => k % colors),
			rng
		);
		// Uneven fills, with zero or one spare tube.
		/** @type {number[][]} */
		const tubes = Array.from({ length: colors + Math.floor(rng() * 2) }, () => []);
		for (const ball of balls) {
			const open = tubes.filter((t) => t.length < capacity);
			open[Math.floor(rng() * open.length)].push(ball);
		}
		const expected = solvable(tubes, capacity);
		const result = solve(tubes, capacity, { maxNodes: 1e6 });
		assert.equal(result.status, expected ? 'solved' : 'unsolvable', JSON.stringify(tubes));
		if (!expected) unsolvable++;
	}
	assert.ok(unsolvable > 10, 'the sample includes dead ends');
});
