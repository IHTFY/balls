// Pure rules on tubes of color numbers, or of balls where covers matter. Each tube
// lists balls bottom to top.

/** @typedef {number[][]} Tubes */
/** @typedef {import('./snapshot.js').Ball} Ball */

/** Empty tubes a player may add to one puzzle. */
export const MAX_ADDED_TUBES = 2;

/** @param {number[]} tube */
const top = (tube) => tube[tube.length - 1];

/**
 * Whether one ball may move from `from` to `to`.
 * @param {Tubes} tubes
 * @param {number} from
 * @param {number} to
 * @param {number} capacity
 */
export function canMove(tubes, from, to, capacity) {
	if (from === to) return false;
	const source = tubes[from];
	const target = tubes[to];
	if (!source?.length || !target || target.length >= capacity) return false;
	return target.length === 0 || top(target) === top(source);
}

/**
 * A full tube of one color.
 * @param {number[]} tube
 * @param {number} capacity
 */
export function isTubeComplete(tube, capacity) {
	return tube.length === capacity && tube.every((c) => c === tube[0]);
}

/**
 * Every tube is empty or complete.
 * @param {Tubes} tubes
 * @param {number} capacity
 */
export function isSolved(tubes, capacity) {
	return tubes.every((t) => t.length === 0 || isTubeComplete(t, capacity));
}

/**
 * Number of matching balls at the top of a tube.
 * @param {number[]} tube
 */
export function topRun(tube) {
	let n = 0;
	for (let i = tube.length - 1; i >= 0 && tube[i] === tube[tube.length - 1]; i--) n++;
	return n;
}

/**
 * Legal single-ball moves that could make progress. Moves that only shuffle a
 * one-color tube into an empty tube are skipped.
 * @param {Tubes} tubes
 * @param {number} capacity
 * @returns {[number, number][]}
 */
export function usefulMoves(tubes, capacity) {
	/** @type {[number, number][]} */
	const moves = [];
	for (let from = 0; from < tubes.length; from++) {
		const source = tubes[from];
		if (!source.length || isTubeComplete(source, capacity)) continue;
		const uniform = topRun(source) === source.length;
		for (let to = 0; to < tubes.length; to++) {
			if (!canMove(tubes, from, to, capacity)) continue;
			if (uniform && tubes[to].length === 0) continue;
			moves.push([from, to]);
		}
	}
	return moves;
}

/**
 * Covers a Mystery deal: every ball but each tube's top.
 * @param {{ id: number, color: number }[][]} tubes
 * @param {boolean} mystery
 * @returns {Ball[][]}
 */
export const dealCovers = (tubes, mystery) =>
	tubes.map((tube) =>
		tube.map(({ id, color }, i) => ({ id, color, hidden: mystery && i < tube.length - 1 }))
	);

/**
 * Moves the top `count` balls from one tube to another and uncovers what that
 * shows: the ball left on top of the source, and every ball in a tube it finishes.
 * @param {Ball[][]} tubes
 * @param {number} from
 * @param {number} to
 * @param {number} count
 * @param {number} capacity
 */
export function shiftBalls(tubes, from, to, count, capacity) {
	const source = tubes[from];
	const balls = source.slice(source.length - count);
	const rest = source.slice(0, source.length - count);
	const below = rest[rest.length - 1];
	const revealed = !!below?.hidden;
	if (revealed) rest[rest.length - 1] = { ...below, hidden: false };
	// A finished tube shows its true color, so its hidden balls are revealed too.
	let filled = [...tubes[to], ...balls];
	const sealed =
		isTubeComplete(
			filled.map((b) => b.color),
			capacity
		) && filled.some((b) => b.hidden);
	if (sealed) filled = filled.map((b) => (b.hidden ? { ...b, hidden: false } : b));
	const next = [...tubes];
	next[from] = rest;
	next[to] = filled;
	return { tubes: next, balls, revealed, sealed };
}
