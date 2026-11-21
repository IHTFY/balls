import assert from 'node:assert/strict';
import { test } from 'node:test';
import './helpers/runes-loader.js';

const {
	HINT_PRICE,
	game,
	session,
	startBlitz,
	startLevel,
	startDaily,
	replay,
	save,
	finish,
	requestHint,
	cancelHint
} = await import('../src/lib/state/session.svelte.js');
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
