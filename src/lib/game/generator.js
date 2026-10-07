// Builds puzzles from a seed and proves each one solvable before it is played.
import { createRng, shuffleInPlace } from './rng.js';
import { isTubeComplete } from './rules.js';
import { solve } from './solver.js';

/**
 * @typedef {object} PuzzleSpec
 * @property {number} colors
 * @property {number} capacity
 * @property {number} empty number of empty tubes
 * @property {boolean} [mystery] hide every ball below the top until uncovered
 */

/**
 * @typedef {object} Puzzle
 * @property {number[][]} tubes bottom to top
 * @property {number} capacity
 * @property {number} par single-ball moves in the best known solution
 * @property {boolean} mystery
 */

const MAX_DEALS = 60;

/**
 * Deals every ball at random into full tubes, then adds empty tubes.
 * @param {PuzzleSpec} spec
 * @param {() => number} rng
 */
function deal({ colors, capacity, empty }, rng) {
	/** @type {number[]} */
	const balls = [];
	for (let c = 0; c < colors; c++) for (let i = 0; i < capacity; i++) balls.push(c);
	shuffleInPlace(balls, rng);
	/** @type {number[][]} */
	const tubes = [];
	for (let t = 0; t < colors; t++) tubes.push(balls.slice(t * capacity, (t + 1) * capacity));
	for (let e = 0; e < empty; e++) tubes.push([]);
	return tubes;
}

/**
 * A deal is too easy if any tube starts sorted or nearly sorted.
 * @param {number[][]} tubes
 * @param {number} capacity
 */
function tooEasy(tubes, capacity) {
	return tubes.some(
		(t) =>
			isTubeComplete(t, capacity) ||
			(capacity > 3 && t.length > 0 && t.slice(0, capacity - 1).every((c) => c === t[0]))
	);
}

/**
 * Fallback that always succeeds: scramble a solved board with reversible moves.
 * @param {PuzzleSpec} spec
 * @param {() => number} rng
 */
function scramble({ colors, capacity, empty }, rng) {
	/** @type {number[][]} */
	const tubes = [];
	for (let c = 0; c < colors; c++) tubes.push(Array(capacity).fill(c));
	for (let e = 0; e < empty; e++) tubes.push([]);
	for (let step = 0; step < colors * capacity * 30; step++) {
		const from = Math.floor(rng() * tubes.length);
		const to = Math.floor(rng() * tubes.length);
		const source = tubes[from];
		if (from === to || !source.length || tubes[to].length >= capacity) continue;
		// The reverse move must be legal: the ball below must match, or none.
		const below = source[source.length - 2];
		if (below !== undefined && below !== source[source.length - 1]) continue;
		tubes[to].push(/** @type {number} */ (source.pop()));
	}
	return tubes;
}

// Par searches, best first: optimal on small boards, near-optimal on big ones.
const PAR_SEARCHES = [
	{ weight: 1, maxNodes: 6_000 },
	{ weight: 1.5, maxNodes: 25_000 }
];

/**
 * The shortest solution found by a cheap search followed by better ones.
 * @param {number[][]} tubes
 * @param {number} capacity
 * @returns {number | null} null when no search finds a solution
 */
function findPar(tubes, capacity) {
	const quick = solve(tubes, capacity, { weight: 2.5, maxNodes: 20_000 });
	if (quick.status !== 'solved') return null;
	let par = quick.moves.length;
	for (const options of PAR_SEARCHES) {
		const result = solve(tubes, capacity, options);
		if (result.status === 'solved') {
			par = Math.min(par, result.moves.length);
			break;
		}
	}
	return par;
}

/**
 * @param {PuzzleSpec} spec
 * @param {number} seed
 * @returns {Puzzle}
 */
export function generatePuzzle(spec, seed) {
	const rng = createRng(seed);
	for (let attempt = 0; attempt < MAX_DEALS; attempt++) {
		const tubes = deal(spec, rng);
		if (attempt < MAX_DEALS / 2 && tooEasy(tubes, spec.capacity)) continue;
		const par = findPar(tubes, spec.capacity);
		// null means no solution was found; 0 means the board is already sorted.
		if (par) return { tubes, capacity: spec.capacity, par, mystery: !!spec.mystery };
	}
	for (;;) {
		const tubes = scramble(spec, rng);
		const par = findPar(tubes, spec.capacity);
		if (par) return { tubes, capacity: spec.capacity, par, mystery: !!spec.mystery };
	}
}
