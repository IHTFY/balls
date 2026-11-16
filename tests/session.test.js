import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';

const { game, session, startBlitz, startLevel, startDaily, replay, save, finish } =
	await import('../src/lib/state/session.svelte.js');
const { profile, resetProfile } = await import('../src/lib/state/profile.svelte.js');
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
