// Weighted A* solver. Used to verify generated levels, set par, and give hints.
// Search states are strings (one char per ball) so hashing stays cheap; a move
// shifts a whole same-color run at once, then expands to single-ball moves.

/** @typedef {import('./rules.js').Tubes} Tubes */
/** @typedef {[number, number]} Move */

const CHAR_BASE = 65;

/** @param {Tubes} tubes */
const encode = (tubes) => tubes.map((t) => String.fromCharCode(...t.map((c) => c + CHAR_BASE)));

/** @param {string[]} tubes */
const keyOf = (tubes) => [...tubes].sort().join(',');

/** @param {string} tube */
function topRunLength(tube) {
	let n = 1;
	const c = tube[tube.length - 1];
	while (n < tube.length && tube[tube.length - 1 - n] === c) n++;
	return n;
}

/** @param {string} tube */
function bottomRunLength(tube) {
	let n = 1;
	while (n < tube.length && tube[n] === tube[0]) n++;
	return n;
}

/**
 * Lower bound on single-ball moves left: every ball above its tube's bottom run
 * must move, and for each color all bottom runs but the largest must move too.
 * @param {string[]} tubes
 */
function heuristic(tubes) {
	let h = 0;
	/** @type {Map<string, {sum: number, max: number}>} */
	const runs = new Map();
	for (const tube of tubes) {
		if (!tube.length) continue;
		const run = bottomRunLength(tube);
		h += tube.length - run;
		const entry = runs.get(tube[0]);
		if (entry) {
			entry.sum += run;
			entry.max = Math.max(entry.max, run);
		} else runs.set(tube[0], { sum: run, max: run });
	}
	for (const { sum, max } of runs.values()) h += sum - max;
	return h;
}

/** Binary min-heap keyed on `f`, ties broken toward deeper nodes. */
class Heap {
	/** @type {SearchNode[]} */
	items = [];
	/** @param {SearchNode} a @param {SearchNode} b */
	less = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);
	get size() {
		return this.items.length;
	}
	/** @param {SearchNode} node */
	push(node) {
		const items = this.items;
		items.push(node);
		let i = items.length - 1;
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (!this.less(items[i], items[parent])) break;
			[items[i], items[parent]] = [items[parent], items[i]];
			i = parent;
		}
	}
	pop() {
		const items = this.items;
		const first = items[0];
		const last = /** @type {SearchNode} */ (items.pop());
		if (items.length) {
			items[0] = last;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1;
				const r = l + 1;
				let m = i;
				if (l < items.length && this.less(items[l], items[m])) m = l;
				if (r < items.length && this.less(items[r], items[m])) m = r;
				if (m === i) break;
				[items[i], items[m]] = [items[m], items[i]];
				i = m;
			}
		}
		return first;
	}
}

/**
 * @typedef {object} SearchNode
 * @property {string[]} tubes
 * @property {number} g single-ball moves so far
 * @property {number} f priority
 * @property {SearchNode | null} parent
 * @property {[number, number, number] | null} move from, to, ball count
 */

/**
 * @param {string[]} tubes
 * @param {number} capacity
 */
function isSolvedEncoded(tubes, capacity) {
	return tubes.every(
		(t) => t.length === 0 || (t.length === capacity && bottomRunLength(t) === capacity)
	);
}

/** @typedef {{ maxNodes?: number, weight?: number, merges?: boolean }} SolveOptions */

/**
 * @typedef {{ status: 'solved', moves: Move[], nodes: number }
 *   | { status: 'unsolvable' | 'unknown', moves: null, nodes: number }} SolveResult
 */

/**
 * Searches for a solution as single-ball moves. `unsolvable` means every
 * reachable position was explored; `unknown` means the node budget ran out.
 * With `weight` 1 the solution is optimal over whole-run moves. With `merges`
 * only moves onto a matching ball are tried, never into an empty tube.
 * @param {Tubes} start
 * @param {number} capacity
 * @param {SolveOptions} [options]
 * @returns {SolveResult}
 */
export function solve(start, capacity, { maxNodes = 200_000, weight = 1.5, merges = false } = {}) {
	const tubes = encode(start);
	if (isSolvedEncoded(tubes, capacity)) return { status: 'solved', moves: [], nodes: 0 };

	const heap = new Heap();
	/** @type {Map<string, number>} */
	const bestG = new Map();
	heap.push({ tubes, g: 0, f: weight * heuristic(tubes), parent: null, move: null });
	bestG.set(keyOf(tubes), 0);
	let nodes = 0;

	while (heap.size) {
		const node = heap.pop();
		if (node.g > (bestG.get(keyOf(node.tubes)) ?? Infinity)) continue;
		if (isSolvedEncoded(node.tubes, capacity))
			return { status: 'solved', moves: unwind(node), nodes };
		if (++nodes > maxNodes) return { status: 'unknown', moves: null, nodes };

		const state = node.tubes;
		let firstEmpty = -1;
		for (let i = 0; i < state.length; i++) {
			if (!state[i].length) {
				firstEmpty = i;
				break;
			}
		}
		for (let from = 0; from < state.length; from++) {
			const source = state[from];
			if (!source.length) continue;
			const run = topRunLength(source);
			if (run === source.length && source.length === capacity) continue;
			const color = source[source.length - 1];
			for (let to = 0; to < state.length; to++) {
				if (to === from) continue;
				const target = state[to];
				if (target.length >= capacity) continue;
				if (target.length === 0) {
					if (merges) continue;
					// Empty tubes are interchangeable; moving a one-color tube into one is pointless.
					if (to !== firstEmpty || run === source.length) continue;
				} else if (target[target.length - 1] !== color) continue;
				const count = Math.min(run, capacity - target.length);
				const next = state.slice();
				next[from] = source.slice(0, source.length - count);
				next[to] = target + color.repeat(count);
				const g = node.g + count;
				const key = keyOf(next);
				if (g >= (bestG.get(key) ?? Infinity)) continue;
				bestG.set(key, g);
				heap.push({
					tubes: next,
					g,
					f: g + weight * heuristic(next),
					parent: node,
					move: [from, to, count]
				});
			}
		}
	}
	return { status: 'unsolvable', moves: null, nodes };
}

/** @param {SearchNode} node */
function unwind(node) {
	/** @type {Move[]} */
	const moves = [];
	for (let n = /** @type {SearchNode | null} */ (node); n?.move; n = n.parent) {
		const [from, to, count] = n.move;
		for (let i = 0; i < count; i++) moves.push([from, to]);
	}
	return moves.reverse();
}
