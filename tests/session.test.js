import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';

const { game, session, startBlitz, startLevel, startZen, startDaily, replay, save, finish } =
	await import('../src/lib/state/session.svelte.js');
const { profile, resetProfile } = await import('../src/lib/state/profile.svelte.js');
import { levelSeed } from '../src/lib/game/levels.js';
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

test('an intact saved game keeps its own seed, colors, and flags', async () => {
	await resumeDamagedSave({ seed: 99, colors: 2, boss: true, mystery: true });
	assert.equal(session.seed, 99);
	assert.equal(session.colors, 2);
	assert.equal(session.boss, true);
	assert.equal(session.mystery, true);
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

test('replaying a resumed Zen game with a damaged seed plays the same puzzle', async () => {
	resetProfile();
	startZen('easy');
	await settle();
	const [from, to] = usefulMoves(game.colorTubes, game.capacity)[0];
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
