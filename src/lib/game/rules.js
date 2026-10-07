// Pure rules on tubes of color numbers. Each tube lists balls bottom to top.

/** @typedef {number[][]} Tubes */

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
