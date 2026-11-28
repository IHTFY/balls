// Checks a saved game before it is resumed.
import { canMove } from './rules.js';

/** @typedef {{ id: number, color: number, hidden: boolean }} Ball */
/** @typedef {{ from: number, to: number, count: number }} HistoryEntry */
/** @typedef {import('./generator.js').PuzzleSpec} PuzzleSpec */

const isCount = (/** @type {unknown} */ v) => Number.isInteger(v) && /** @type {number} */ (v) >= 0;
const isBall = (/** @type {any} */ b) =>
	b && isCount(b.id) && isCount(b.color) && typeof b.hidden === 'boolean';

/**
 * A saved game is valid when its start could have been dealt for the puzzle it
 * is resumed as, and it is a legal position of that start: the same tubes plus
 * any added ones, nothing overfull, and a history that replays from the start to
 * this board.
 * @param {any} s
 * @param {PuzzleSpec} spec the puzzle the save is for
 */
export function validSnapshot(s, spec) {
	if (!s || typeof s !== 'object') return false;
	const counts = [
		'capacity',
		'par',
		'moves',
		'seconds',
		'undos',
		'hintsUsed',
		'tubesAdded',
		'bestCombo'
	];
	if (!counts.every((k) => isCount(s[k])) || s.capacity < 2) return false;
	const tubesOk = (/** @type {any} */ t) =>
		Array.isArray(t) &&
		t.every((tube) => Array.isArray(tube) && tube.length <= s.capacity && tube.every(isBall));
	if (!tubesOk(s.start) || !tubesOk(s.tubes)) return false;
	// A start of another shape may leave no move at all, so it must have the puzzle's
	// tubes, each color filling exactly one tube's worth, and every ball its own id.
	/** @type {Ball[]} */
	const balls = s.start.flat();
	if (
		s.capacity !== spec.capacity ||
		s.start.length !== spec.colors + spec.empty ||
		balls.length !== spec.colors * spec.capacity ||
		Array.from({ length: spec.colors }, (_, c) => c).some(
			(c) => balls.filter((b) => b.color === c).length !== spec.capacity
		) ||
		new Set(balls.map((b) => b.id)).size !== balls.length
	)
		return false;
	// Every dealt puzzle opens with a move to make.
	/** @type {number[][]} */
	const colors = s.start.map((/** @type {Ball[]} */ tube) => tube.map((b) => b.color));
	if (!colors.some((_, from) => colors.some((_, to) => canMove(colors, from, to, s.capacity))))
		return false;
	if (s.tubes.length !== s.start.length + s.tubesAdded) return false;
	if (
		!Array.isArray(s.history) ||
		!s.history.every(
			(/** @type {any} */ h) =>
				h &&
				isCount(h.from) &&
				isCount(h.to) &&
				h.from < s.tubes.length &&
				h.to < s.tubes.length &&
				Number.isInteger(h.count) &&
				h.count > 0
		)
	)
		return false;
	// Undo walks the history back, so it must replay from the start to this exact
	// board, and the move count must be the balls it moved.
	/** @type {HistoryEntry[]} */
	const history = s.history;
	if (history.reduce((sum, h) => sum + h.count, 0) !== s.moves) return false;
	/** @type {Ball[][]} */
	const board = [...s.start, ...Array.from({ length: s.tubesAdded }, () => [])].map((t) => [...t]);
	for (const { from, to, count } of history) {
		if (board[from].length < count || board[to].length + count > s.capacity) return false;
		board[to].push(...board[from].splice(board[from].length - count));
	}
	const key = (/** @type {Ball[]} */ tube) => tube.map((b) => `${b.id}:${b.color}`).join();
	return board.every((tube, i) => key(tube) === key(s.tubes[i]));
}
