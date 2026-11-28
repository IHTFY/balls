import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';

const {
	HINT_PRICE,
	game,
	session,
	startBlitz,
	tick,
	startLevel,
	startZen,
	startDaily,
	replay,
	save,
	finish,
	requestHint,
	cancelHint,
	addTube
} = await import('../src/lib/state/session.svelte.js');
const { profile, resetProfile } = await import('../src/lib/state/profile.svelte.js');
import { levelSeed, levelSpec } from '../src/lib/game/levels.js';
import { MAX_SCORE } from '../src/lib/game/scoring.js';
import { usefulMoves } from '../src/lib/game/rules.js';
import { solve } from '../src/lib/game/solver.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('a previous Blitz celebration cannot replace a newly started run', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	let random = 0;
	t.mock.method(Math, 'random', () => (random += 0.1) % 1);
	resetProfile();
	startBlitz();
	await settle();
	const stop = game.on((event) => {
		if (event.type === 'win') finish(event.version);
	});
	const solution = solve(game.colorTubes, game.capacity);
	assert.equal(solution.status, 'solved');
	for (const [from, to] of solution.moves) {
		game.tap(from);
		game.tap(to);
	}
	stop();
	assert.equal(session.blitz.solved, 1);
	// Home and then Blitz again before the 900 ms celebration has ended.
	startBlitz();
	await settle();
	const freshSeed = session.seed;
	assert.equal(session.blitz.solved, 0);
	const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
	game.tap(from);
	game.tap(to);
	const freshMoves = game.moves;
	assert.equal(freshMoves, 1);
	t.mock.timers.tick(900);
	await settle();
	assert.equal(game.moves, freshMoves, 'the old run must not erase moves in the new run');
	assert.equal(session.seed, freshSeed);
});

function solveCurrentBoard() {
	const solution = solve(game.colorTubes, game.capacity);
	assert.equal(solution.status, 'solved');
	for (const [from, to] of solution.moves) {
		game.tap(from);
		game.tap(to);
	}
	assert.equal(game.won, true);
	return game.version;
}

test('a board solved during loading cannot earn the next daily reward', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	startDaily();
	assert.equal(session.loading, true);
	finish(solveCurrentBoard());
	assert.equal(profile.stats.dailySolved, 0);
	assert.deepEqual(Object.keys(profile.daily.done), []);
	assert.equal(profile.score, 0);
	await settle();
});

test('only the current winning position earns rewards, once per board', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	const oldVersion = solveCurrentBoard();
	startLevel(2);
	await settle();
	const version = solveCurrentBoard();
	finish(oldVersion);
	assert.equal(profile.stats.solved, 0);
	finish(version);
	assert.equal(profile.stats.solved, 1);
	assert.equal(session.result?.mode, 'level');
	assert.equal(session.result?.title, 'Level 2');
	const score = profile.score;
	finish(version);
	assert.equal(profile.stats.solved, 1);
	assert.equal(profile.score, score);
	replay();
	finish(solveCurrentBoard());
	assert.equal(profile.stats.solved, 2);
});

test('a resumed board can still earn its own reward', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
	game.tap(from);
	game.tap(to);
	save();
	startDaily();
	startLevel(1);
	assert.equal(session.loading, false);
	assert.equal(game.moves, 1);
	finish(solveCurrentBoard());
	assert.equal(profile.stats.solved, 1);
	assert.equal(session.result?.title, 'Level 1');
	await settle();
	assert.equal(session.result?.title, 'Level 1');
});

test('a hint that arrives after leaving the board is not charged or shown', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	const hints = profile.hints;
	const asked = requestHint();
	startLevel(2);
	assert.equal(await asked, 'busy');
	await settle();
	assert.equal(game.hint, null);
	assert.equal(game.hintsUsed, 0);
	assert.equal(profile.hints, hints);
	assert.equal(profile.stats.hintsUsed, 0);
});

test('nothing is charged or saved while the hint search runs', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = 100;
	const saved = JSON.stringify(profile.saved);
	const asked = requestHint();
	assert.equal(session.hintBusy, true);
	assert.equal(profile.coins, 100);
	assert.equal(profile.hints, 0);
	assert.equal(profile.stats.hintsUsed, 0);
	assert.equal(JSON.stringify(profile.saved), saved);
	await asked;
});

test('a hint with no stock is paid for in coins when it is shown', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = 100;
	assert.equal(await requestHint(), 'ok');
	assert.notEqual(game.hint, null);
	assert.equal(profile.coins, 100 - HINT_PRICE);
	assert.equal(profile.hints, 0);
	assert.equal(profile.stats.hintsUsed, 1);
});

test('a hint is refused up front when there is neither stock nor coins', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = HINT_PRICE - 1;
	assert.equal(await requestHint(), 'empty');
	assert.equal(session.hintBusy, false);
	assert.equal(profile.coins, HINT_PRICE - 1);
});

test('a hint whose coins were spent while searching is not shown', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = HINT_PRICE;
	const asked = requestHint();
	// Another open copy spent the coins meanwhile.
	profile.coins = 0;
	assert.equal(await asked, 'empty');
	assert.equal(game.hint, null);
	assert.equal(profile.coins, 0);
	assert.equal(profile.stats.hintsUsed, 0);
});

test('a rejected hint search clears busy and charges nothing', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 1;
	// A ball color the solver cannot encode makes the search throw.
	game.tubes = [[{ id: 0, color: /** @type {any} */ (1n), hidden: false }], []];
	await assert.rejects(requestHint());
	assert.equal(session.hintBusy, false);
	assert.equal(profile.hints, 1);
	assert.equal(profile.stats.hintsUsed, 0);
	assert.equal(game.hint, null);
});

test('a hint on the current board is still charged and shown', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	const hints = profile.hints;
	assert.equal(await requestHint(), 'ok');
	assert.notEqual(game.hint, null);
	assert.equal(profile.hints, hints - 1);
	assert.equal(profile.stats.hintsUsed, 1);
	assert.equal(game.hintsUsed, 1);
});

test('a hint still being searched for when the play screen is left is not charged', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = 100;
	const asked = requestHint();
	cancelHint();
	assert.equal(await asked, 'busy');
	await settle();
	assert.equal(game.hint, null);
	assert.equal(game.hintsUsed, 0);
	assert.equal(profile.stats.hintsUsed, 0);
	assert.equal(profile.hints, 0);
	assert.equal(profile.coins, 100);
	assert.equal(session.hintBusy, false);
});

test('leaving the play screen before any hint is asked does not block the next one', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	cancelHint();
	assert.equal(await requestHint(), 'ok');
	assert.notEqual(game.hint, null);
});

test('a hint paid for with stock is not charged to coins when the stock is used elsewhere meanwhile', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 1;
	profile.coins = 100;
	const asked = requestHint();
	// Another open copy used the stocked hint meanwhile.
	profile.hints = 0;
	assert.equal(await asked, 'empty');
	assert.equal(game.hint, null);
	assert.equal(game.hintsUsed, 0);
	assert.equal(profile.stats.hintsUsed, 0);
	assert.equal(profile.hints, 0);
	assert.equal(profile.coins, 100);
	assert.equal(session.hintBusy, false);
});

test('a canceled hint search does not keep the next hint waiting', async () => {
	resetProfile();
	startLevel(1);
	await settle();
	profile.hints = 0;
	profile.coins = 100;
	const canceled = requestHint();
	cancelHint();
	assert.equal(session.hintBusy, false);
	// The same board is picked up again at once.
	startLevel(1);
	await settle();
	assert.equal(session.hintBusy, false);
	const current = requestHint();
	assert.equal(session.hintBusy, true);
	assert.equal(await canceled, 'busy');
	assert.equal(await current, 'ok');
	assert.equal(session.hintBusy, false);
	assert.equal(profile.coins, 100 - HINT_PRICE);
	assert.equal(profile.stats.hintsUsed, 1);
});

/**
 * Saves a move on level 1, damages the save with `patch`, leaves, and resumes it.
 * @param {Record<string, unknown>} patch
 */
async function resumeDamagedSave(patch) {
	resetProfile();
	profile.score = 12345;
	startLevel(1);
	await settle();
	const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
	game.tap(from);
	game.tap(to);
	save();
	Object.assign(/** @type {object} */ (profile.saved), patch);
	startLevel(2);
	startLevel(1);
	assert.equal(session.loading, false, 'the save resumed');
}

/** @type {[string, Record<string, unknown>][]} */
const damagedColors = [
	['colors missing', { colors: undefined }],
	['colors not a number', { colors: 'many' }],
	['colors not a whole number', { colors: 2.5 }],
	['colors zero', { colors: 0 }]
];

for (const [name, patch] of damagedColors) {
	test(`a saved game with ${name} still scores and keeps lifetime points`, async () => {
		await resumeDamagedSave(patch);
		assert.equal(session.colors, 2, "the level's own color count");
		finish(solveCurrentBoard());
		assert.equal(Number.isFinite(session.result?.score), true);
		assert.ok(profile.score > 12345, 'the score was added to lifetime points');
		assert.ok(Number.isFinite(profile.score));
	});
}

test('a saved game with other damaged fields falls back to the level', async () => {
	await resumeDamagedSave({ boss: 'yes', mystery: 1, seed: 'x' });
	assert.equal(session.boss, false);
	assert.equal(session.mystery, false);
	assert.equal(session.seed, levelSeed(1));
});

test('an intact saved game keeps its own seed', async () => {
	await resumeDamagedSave({ seed: 99 });
	assert.equal(session.seed, 99);
});

test('a saved boss or mystery flag does not change the rewards of an ordinary level', async () => {
	await resumeDamagedSave({});
	finish(solveCurrentBoard());
	const honest = { score: session.result?.score, coins: session.result?.coins };
	await resumeDamagedSave({ boss: true, mystery: true });
	assert.equal(session.boss, false);
	assert.equal(session.mystery, false);
	finish(solveCurrentBoard());
	assert.deepEqual({ score: session.result?.score, coins: session.result?.coins }, honest);
	assert.equal(profile.stats.bossesBeaten, 0);
	assert.equal(profile.stats.mysterySolved, 0);
});

test('hidden balls in a saved board do not make an ordinary level a Mystery', async () => {
	await resumeDamagedSave({});
	finish(solveCurrentBoard());
	const honest = { score: session.result?.score, coins: session.result?.coins };
	resetProfile();
	profile.score = 12345;
	startLevel(1);
	await settle();
	const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
	game.tap(from);
	game.tap(to);
	save();
	// A forged flag on a board that otherwise stays valid.
	const saved = /** @type {any} */ (profile.saved);
	for (const tubes of [saved.game.start, saved.game.tubes])
		for (const tube of tubes) for (const ball of tube) ball.hidden = true;
	startLevel(2);
	startLevel(1);
	assert.equal(session.loading, false, 'the save resumed');
	assert.equal(session.mystery, false);
	assert.equal(game.hasHidden, false, 'every ball is in view');
	assert.ok(game.start.flat().every((ball) => !ball.hidden));
	finish(solveCurrentBoard());
	assert.deepEqual({ score: session.result?.score, coins: session.result?.coins }, honest);
	assert.equal(profile.stats.mysterySolved, 0);
});

test('a Mystery save that covers more balls than play can resumes with only those play covers', async () => {
	resetProfile();
	startLevel(18);
	await settle();
	assert.equal(session.mystery, true);
	const [from, to] = usefulMoves(game.knownTubes, game.capacity)[0];
	game.tap(from);
	game.tap(to);
	save();
	const played = JSON.stringify(game.snapshot());
	// A forged save that covers every ball, tops included, in the board and its start.
	const saved = /** @type {any} */ (profile.saved);
	for (const tubes of [saved.game.start, saved.game.tubes])
		for (const tube of tubes) for (const ball of tube) ball.hidden = true;
	startLevel(2);
	startLevel(18);
	assert.equal(session.loading, false, 'the save resumed');
	assert.equal(JSON.stringify(game.snapshot()), played, 'the covers play left');
});

/**
 * A save of `start` (colors, bottom to top) after `history`, with the covers a deal leaves
 * when `mystery`, as a hand edit could write it.
 * @param {number[][]} start
 * @param {{ from: number, to: number, count: number }[]} history
 * @param {{ capacity: number, mystery?: boolean, tubesAdded?: number, undos?: number }} options
 */
function handSave(start, history, { capacity, mystery = false, tubesAdded = 0, undos = 0 }) {
	let id = 0;
	const dealt = start.map((tube) =>
		tube.map((color, i) => ({ id: id++, color, hidden: mystery && i < tube.length - 1 }))
	);
	const tubes = [...dealt, ...Array.from({ length: tubesAdded }, () => [])].map((t) => [...t]);
	for (const { from, to, count } of history)
		tubes[to].push(...tubes[from].splice(tubes[from].length - count));
	return {
		start: dealt,
		tubes,
		history,
		capacity,
		par: 3,
		moves: history.reduce((sum, h) => sum + h.count, 0),
		seconds: 0,
		undos,
		hintsUsed: 0,
		tubesAdded,
		bestCombo: 0
	};
}

const { Game } = await import('../src/lib/state/game.svelte.js');
const freshGame = () => new Game(() => ({ stacks: true, autoMove: false }));

test('a resumed Mystery tube dealt finished stays covered, as when it was dealt', () => {
	const spec = { colors: 2, capacity: 2, empty: 1, mystery: true };
	const g = freshGame();
	assert.ok(g.restore(handSave([[0, 0], [1], [1]], [], spec), spec));
	assert.deepEqual(
		g.tubes.map((tube) => tube.map((b) => b.hidden)),
		[[true, false], [false], [false]]
	);
});

test('a resumed Mystery ball that a saved move uncovered stays uncovered', () => {
	const spec = { colors: 2, capacity: 3, empty: 1, mystery: true };
	// The top ball leaves and comes back onto its twin, which the first move uncovered.
	const history = [
		{ from: 0, to: 2, count: 1 },
		{ from: 2, to: 0, count: 1 }
	];
	const g = freshGame();
	assert.ok(g.restore(handSave([[1, 0, 0], [0, 1, 1], []], history, spec), spec));
	assert.deepEqual(
		g.tubes[0].map((b) => b.hidden),
		[true, false, false]
	);
});

test('a resumed Mystery ball the save shows over a covered one stays covered', () => {
	const spec = { colors: 2, capacity: 3, empty: 1, mystery: true };
	const save = handSave([[1, 0, 0], [0, 1, 1], []], [], spec);
	save.tubes[0][0].hidden = false;
	const g = freshGame();
	assert.ok(g.restore(save, spec));
	assert.deepEqual(
		g.tubes[0].map((b) => b.hidden),
		[true, true, false]
	);
});

test('a Mystery save lifts again whole what an earlier saved move lifted', () => {
	const spec = { colors: 2, capacity: 4, empty: 2, mystery: true };
	const start = [[1, 0, 0, 0], [0, 1, 1, 1], [], []];
	// Undo can uncover the run below the top, so the save may show it and lift all three.
	const lift = (/** @type {number} */ count) => {
		const history = [
			{ from: 0, to: 2, count: 3 },
			{ from: 2, to: 3, count }
		];
		const save = handSave(start, history, { ...spec, undos: 1 });
		for (const tube of save.tubes) for (const ball of tube) ball.hidden = false;
		return freshGame().restore(save, spec);
	};
	assert.equal(lift(3), true, 'the whole run again');
	assert.equal(lift(2), false, 'two of the three it lifted');
});

test('a save whose history moves a ball out of a finished tube starts fresh', () => {
	const spec = { colors: 2, capacity: 2, empty: 1 };
	const save = handSave([[0, 0], [1], [1]], [{ from: 0, to: 3, count: 1 }], {
		...spec,
		tubesAdded: 1
	});
	assert.equal(freshGame().restore(save, spec), false);
});

test('a save whose history lifts part of a run play would lift whole starts fresh', () => {
	const spec = { colors: 2, capacity: 4, empty: 1 };
	const start = [[1, 0, 0, 0], [0, 1, 1, 1], []];
	const lift = (/** @type {number} */ count) =>
		freshGame().restore(handSave(start, [{ from: 0, to: 2, count }], spec), spec);
	assert.equal(lift(1), true, 'one ball, as with stacks off');
	assert.equal(lift(3), true, 'the whole run');
	assert.equal(lift(2), false, 'two of three with room for all');
});

test("a saved color count that does not match the board is replaced by the board's own", async () => {
	await resumeDamagedSave({});
	finish(solveCurrentBoard());
	const honest = session.result?.score;
	await resumeDamagedSave({ colors: 99 });
	assert.equal(session.colors, 2);
	finish(solveCurrentBoard());
	assert.equal(session.result?.score, honest, 'points are for two colors, not 99');
});

test('a saved level whose board is not the level starts the level fresh', async () => {
	resetProfile();
	const start = [[{ id: 0, color: 0, hidden: false }]];
	profile.saved = {
		mode: 'level',
		level: 1,
		seed: levelSeed(1),
		colors: 1,
		boss: false,
		mystery: false,
		game: {
			start,
			tubes: start,
			history: [],
			capacity: levelSpec(1).capacity,
			par: 1,
			moves: 0,
			seconds: 0,
			undos: 0,
			hintsUsed: 0,
			tubesAdded: 0,
			bestCombo: 0
		}
	};
	startLevel(1);
	assert.equal(session.loading, true, 'the save was not resumed');
	await settle();
	assert.equal(session.loading, false);
	assert.equal(game.tubes.length, 3);
	assert.ok(usefulMoves(game.colorTubes, game.capacity).length > 0);
	assert.equal(
		/** @type {any} */ (profile.saved)?.game.start.length,
		3,
		'the fresh board replaced the damaged save'
	);
});

/** @type {[string, () => void][]} */
const puzzles = [
	['an early level', () => startLevel(1)],
	['a boss level', () => startLevel(10)],
	['a Mystery level', () => startLevel(18)],
	['a level with taller tubes', () => startLevel(31)],
	['a level with one empty tube', () => startLevel(46)],
	['a Sunday Daily Challenge', startDaily],
	['a Zen game', () => startZen('expert')]
];

for (const [name, start] of puzzles) {
	test(`${name} saved mid-game with a tube added and a hint used resumes`, async (t) => {
		// A fixed day, so the Daily Challenge is still the same one when it resumes.
		t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 29, 23, 59, 59) });
		resetProfile();
		profile.tubes = 1;
		start();
		await settle();
		assert.equal(session.loading, false);
		const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
		game.tap(from);
		game.tap(to);
		assert.equal(addTube(), 'ok');
		// A hint is saved only as this count; asking for one would depend on the solver's reach.
		game.hintsUsed++;
		save();
		const played = JSON.stringify(game.snapshot());
		startBlitz();
		start();
		assert.equal(session.loading, false, 'the save resumed');
		assert.equal(JSON.stringify(game.snapshot()), played);
		assert.equal(game.tubesAdded, 1);
		assert.equal(game.hintsUsed, 1);
	});
}

test('replaying a resumed Zen game with a damaged seed plays the same puzzle', async (t) => {
	// The first seed's first useful move leaves the board unsolvable, so the first move comes from
	// the solver. Later calls, such as the fallback when the save resumes, get a different board.
	let calls = 0;
	t.mock.method(Math, 'random', () => (calls++ === 0 ? 42813 : 7) / 2 ** 32);
	resetProfile();
	startZen('easy');
	await settle();
	const solution = solve(game.colorTubes, game.capacity);
	assert.equal(solution.status, 'solved');
	const [from, to] = solution.moves[0];
	game.tap(from);
	game.tap(to);
	save();
	const colors = () => JSON.stringify(game.start.map((tube) => tube.map((ball) => ball.color)));
	const original = colors();
	Object.assign(/** @type {object} */ (profile.saved), { seed: 'x' });
	startZen('easy');
	assert.equal(session.loading, false, 'the save resumed');
	assert.equal(colors(), original);
	finish(solveCurrentBoard());
	replay();
	await settle();
	assert.equal(colors(), original);
	assert.equal(game.moves, 0);
});

test('lifetime points stop at the maximum when an award would pass it', async () => {
	resetProfile();
	profile.score = MAX_SCORE - 1;
	startLevel(1);
	await settle();
	finish(solveCurrentBoard());
	assert.equal(profile.score, MAX_SCORE);
});

test('Blitz points stop at the maximum lifetime score', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] });
	resetProfile();
	profile.score = MAX_SCORE - 1;
	startBlitz();
	await settle();
	session.blitz.score = 500;
	session.blitz.left = 0;
	tick(1);
	assert.equal(session.blitz.over, true);
	assert.equal(profile.score, MAX_SCORE);
});
